console.log('User Monitor loaded');

// User Connection Tracking
let connectedUsers = new Map();
let userEntityMap = new Map(); // Map von User ID zu deren Entities
let disconnectionCallbacks = [];

// User Disconnection Detection System
class UserDisconnectionDetector {
  constructor() {
    this.connectedClients = new Set();
    this.clientEntityMap = new Map(); // clientId -> Set of entity IDs
    this.heartbeatInterval = 1000; // 5 seconds
    this.heartbeatTimeout = 3000; // 15 seconds timeout
    this.lastHeartbeats = new Map(); // clientId -> timestamp
    this.heartbeatTimer = null;
    
    this.init();
  }
  
  init() {
    // NAF connection events abhören
    this.setupNAFListeners();

    // Browser events für Disconnection überwachen
    this.setupBrowserListeners();
    
    // Heartbeat system starten
    this.startHeartbeat();
  }
  
  setupNAFListeners() {
    // Wenn NAF bereits connected ist
    if (typeof NAF !== 'undefined' && NAF.clientId) {
      this.onConnected();
    } else {
      // NAF events werden auf document gefeuert!
      document.addEventListener('connected', () => this.onConnected());
    }
    
    // Client connected event - auf document!
    document.addEventListener('clientConnected', (evt) => {
      const clientId = evt.detail.clientId;
      console.log('User connected:', clientId);
      this.connectedClients.add(clientId);
      this.lastHeartbeats.set(clientId, Date.now());
      
      // Event für andere Komponenten
      document.dispatchEvent(new CustomEvent('userConnected', { 
        detail: { clientId, timestamp: Date.now() } 
      }));
    });
    
    // Client disconnected event - auf document!
    document.addEventListener('clientDisconnected', (evt) => {
      const clientId = evt.detail.clientId;
      console.log('User disconnected:', clientId);
      this.handleUserDisconnection(clientId, 'explicit_disconnect');
    });
    
    // Entity ownership changes (passiert bei Disconnects) - auf document!
    document.addEventListener('entityOwnershipChanged', (evt) => {
      console.log('Entity ownership changed:', evt.detail);
    });
  }
  
  setupBrowserListeners() {
    // Page Visibility API - User wechselt Tab/minimiert
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        console.log('Lokaler User: Page hidden (potentielle Disconnection)');
        this.handleLocalUserHidden();
      } else {
        console.log('Lokaler User: Page visible wieder');
        this.handleLocalUserVisible();
      }
    });
    
    // Beforeunload - User schließt Tab/Browser
    window.addEventListener('beforeunload', () => {
      console.log('Lokaler User: Beforeunload (schließt Browser/Tab)');
      this.handleLocalUserLeaving();
    });
    
    // Online/Offline events
    window.addEventListener('offline', () => {
      console.log('Lokaler User: Offline');
      this.handleNetworkDisconnection();
    });
    
    window.addEventListener('online', () => {
      console.log('Lokaler User: Online wieder');
      this.handleNetworkReconnection();
    });
  }
  
  onConnected() {
    if (typeof NAF === 'undefined') {
      console.warn('NAF not available, limited functionality');
      return;
    }
    
    console.log('NAF connected, eigene Client ID:', NAF.clientId);
    this.connectedClients.add(NAF.clientId);
    this.lastHeartbeats.set(NAF.clientId, Date.now());
    
    // Warten bis NAF.connection vollständig bereit ist
    const setupDataChannel = () => {
      if (NAF.connection && NAF.connection.subscribeToDataChannel) {
        console.log('Setting up heartbeat data channel...');
        try {
          NAF.connection.subscribeToDataChannel('heartbeat', (senderId, dataType, data) => {
            console.log('Heartbeat received from:', senderId);
            this.handleHeartbeat(senderId, data);
          });
          console.log('Heartbeat data channel subscribed successfully');
        } catch (error) {
          console.error('Error subscribing to data channel:', error);
        }
      } else {
        console.warn('NAF.connection.subscribeToDataChannel not available, retrying...');
        setTimeout(setupDataChannel, 1000); // Retry after 1 second
      }
    };
    
    // Kleine Verzögerung um sicherzustellen dass alles bereit ist
    setTimeout(setupDataChannel, 100);
  }
  
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
      this.checkHeartbeats();
    }, this.heartbeatInterval);
  }
  
  sendHeartbeat() {
    if (typeof NAF !== 'undefined' && NAF.connection && NAF.connection.isConnected() && NAF.connection.broadcastData) {
      const heartbeatData = {
        timestamp: Date.now(),
        clientId: NAF.clientId,
        entities: Array.from(this.getOwnEntities())
      };
      
      try {
        NAF.connection.broadcastData('heartbeat', heartbeatData);
        console.log('Heartbeat sent to', this.connectedClients.size, 'clients');
      } catch (error) {
        console.error('Error sending heartbeat:', error);
      }
    } else {
      console.log('NAF not ready for heartbeat, skipping...');
    }
  }
  
  handleHeartbeat(senderId, data) {
    this.lastHeartbeats.set(senderId, Date.now());
    this.connectedClients.add(senderId);
    
    // Update entity mapping
    if (data.entities) {
      this.clientEntityMap.set(senderId, new Set(data.entities));
    }
  }
  
  checkHeartbeats() {
    const now = Date.now();
    const timeoutClients = [];
    
    this.lastHeartbeats.forEach((lastSeen, clientId) => {
      if (now - lastSeen > this.heartbeatTimeout) {
        timeoutClients.push(clientId);
      }
    });
    
    timeoutClients.forEach(clientId => {
      console.log('Heartbeat timeout für User:', clientId);
      this.handleUserDisconnection(clientId, 'heartbeat_timeout');
    });
  }
  
  handleUserDisconnection(clientId, reason) {
    if (!this.connectedClients.has(clientId)) return; // Bereits disconnected
    
    console.log(`User ${clientId} disconnected (${reason})`);
    
    this.connectedClients.delete(clientId);
    this.lastHeartbeats.delete(clientId);
    
    // Entities des disconnected Users finden und bereinigen
    const userEntities = this.clientEntityMap.get(clientId) || new Set();
    this.cleanupUserEntities(clientId, userEntities);
    
    this.clientEntityMap.delete(clientId);
    
    // Callbacks benachrichtigen
    disconnectionCallbacks.forEach(callback => {
      try {
        callback(clientId, reason, Array.from(userEntities));
      } catch (e) {
        console.error('Fehler in disconnection callback:', e);
      }
    });
    
    // Event dispatchen
    document.dispatchEvent(new CustomEvent('userDisconnected', { 
      detail: { 
        clientId, 
        reason, 
        entities: Array.from(userEntities),
        timestamp: Date.now() 
      } 
    }));
  }
  
  cleanupUserEntities(clientId, entityIds) {
    console.log(`Cleanup entities für User ${clientId}:`, entityIds);
    
    entityIds.forEach(entityId => {
      // Nach verschiedenen ID-Formaten suchen
      const possibleIds = [
        entityId,
        `naf-${entityId}`,
        entityId.replace('naf-', '')
      ];
      
      for (const id of possibleIds) {
        const element = document.getElementById(id);
        if (element) {
          console.log(`Entferne Entity ${id} von disconnected User ${clientId}`);
          
          // Aus sources/codes Maps entfernen (falls verfügbar)
          if (typeof sources !== 'undefined' && id.includes('src')) {
            sources.delete(id);
          }
          if (typeof codes !== 'undefined' && id.includes('cod')) {
            codes.delete(id);
          }
          
          // Element deregistrieren und entfernen
          if (element.setAttribute) {
            element.setAttribute('sblove_deregister', 'entity', id);
          }
          
          // DOM entfernen
          try {
            if (element.destroy) element.destroy();
            if (element.parentNode) element.parentNode.removeChild(element);
          } catch (e) {
            console.warn('Fehler beim Entfernen von Element:', e);
          }
          
          break; // Element gefunden und entfernt
        }
      }
    });
    
    // CodeParser nach cleanup ausführen (falls verfügbar)
    setTimeout(() => {
      if (typeof CodeParser === 'function') {
        CodeParser();
      }
    }, 100);
  }
  
  handleLocalUserHidden() {
    // Optional: Lokalen State pausieren
    document.dispatchEvent(new CustomEvent('localUserHidden'));
  }
  
  handleLocalUserVisible() {
    // Reconnect logic falls nötig
    document.dispatchEvent(new CustomEvent('localUserVisible'));
  }
  
  handleLocalUserLeaving() {
    // Cleanup vor dem Verlassen
    this.sendHeartbeat(); // Letzter Heartbeat
    document.dispatchEvent(new CustomEvent('localUserLeaving'));
  }
  
  handleNetworkDisconnection() {
    console.log('Network disconnected');
    document.dispatchEvent(new CustomEvent('networkDisconnected'));
  }
  
  handleNetworkReconnection() {
    console.log('Network reconnected');
    document.dispatchEvent(new CustomEvent('networkReconnected'));
  }
  
  getOwnEntities() {
    const ownEntities = new Set();
    
    // Aus NAF entities
    if (typeof NAF !== 'undefined' && NAF.entities) {
      for (let id in NAF.entities.entities) {
        const entity = NAF.entities.entities[id];
        if (entity && entity.components.networked && entity.components.networked.isMine()) {
          ownEntities.add(id);
        }
      }
    }
    
    // Aus sources/codes Maps (falls verfügbar)
    if (typeof sources !== 'undefined') {
      sources.forEach((_, key) => ownEntities.add(key));
    }
    if (typeof codes !== 'undefined') {
      codes.forEach((_, key) => ownEntities.add(key));
    }
    
    return ownEntities;
  }
  
  // Public API
  isUserConnected(clientId) {
    return this.connectedClients.has(clientId);
  }
  
  getConnectedUsers() {
    return Array.from(this.connectedClients);
  }
  
  getUserEntityCount(clientId) {
    const entities = this.clientEntityMap.get(clientId);
    return entities ? entities.size : 0;
  }
  
  onUserDisconnected(callback) {
    disconnectionCallbacks.push(callback);
  }
  
  removeDisconnectionCallback(callback) {
    const index = disconnectionCallbacks.indexOf(callback);
    if (index > -1) {
      disconnectionCallbacks.splice(index, 1);
    }
  }
  
  destroy() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }
  }
}

// User Activity Tracker
class UserActivityTracker {
  constructor() {
    this.lastActivity = Date.now();
    this.activityThreshold = 30000; // 30 Sekunden Inaktivität
    this.isActive = true;
    this.inactivityCallbacks = [];
    this.activityCallbacks = [];
    this.checkInterval = null;
    
    this.init();
  }
  
  init() {
    // VR/AR spezifische Events
    this.trackVRActivity();
    
    // Standard Web Events
    this.trackWebActivity();
    
    // Periodische Überprüfung starten
    this.startActivityCheck();
  }
  
  trackVRActivity() {
    const scene = document.querySelector('a-scene');
    if (scene) {
      // VR Controller Events
      scene.addEventListener('controllerconnected', () => this.updateActivity());
      scene.addEventListener('controllerdisconnected', () => this.updateActivity());
      
      // Hand tracking events (falls verfügbar)
      scene.addEventListener('hand-tracking-extras-ready', () => this.updateActivity());
      
      // Camera/Head movement
      const camera = document.querySelector('[camera]');
      if (camera) {
        camera.addEventListener('componentchanged', (evt) => {
          if (evt.detail.name === 'position' || evt.detail.name === 'rotation') {
            this.updateActivity();
          }
        });
      }
    }
    
    // Raycaster intersections (Blick/Zeigen)
    document.addEventListener('raycaster-intersection', () => this.updateActivity());
    document.addEventListener('raycaster-intersection-cleared', () => this.updateActivity());
  }
  
  trackWebActivity() {
    // Standard Browser Events
    const events = [
      'mousedown', 'mousemove', 'mouseup',
      'keydown', 'keyup', 'keypress',
      'touchstart', 'touchmove', 'touchend',
      'scroll', 'wheel',
      'focus', 'blur',
      'visibilitychange'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, () => this.updateActivity(), { passive: true });
    });
    
    // Spezielle Behandlung für Page Visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setInactive();
      } else {
        this.updateActivity();
      }
    });
  }
  
  updateActivity() {
    const wasInactive = !this.isActive;
    this.lastActivity = Date.now();
    this.isActive = true;
    
    if (wasInactive) {
      console.log('User ist wieder aktiv');
      this.activityCallbacks.forEach(callback => callback());
    }
  }
  
  setInactive() {
    if (this.isActive) {
      this.isActive = false;
      console.log('User ist inaktiv geworden');
      this.inactivityCallbacks.forEach(callback => callback());
    }
  }
  
  startActivityCheck() {
    this.checkInterval = setInterval(() => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      
      if (timeSinceLastActivity > this.activityThreshold && this.isActive) {
        this.setInactive();
      }
    }, 5000); // Überprüfung alle 5 Sekunden
  }
  
  stopActivityCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  // Public Methods
  isUserActive() {
    return this.isActive;
  }
  
  getTimeSinceLastActivity() {
    return Date.now() - this.lastActivity;
  }
  
  setInactivityThreshold(milliseconds) {
    this.activityThreshold = milliseconds;
  }
  
  onInactivity(callback) {
    this.inactivityCallbacks.push(callback);
  }
  
  onActivity(callback) {
    this.activityCallbacks.push(callback);
  }
  
  removeInactivityCallback(callback) {
    const index = this.inactivityCallbacks.indexOf(callback);
    if (index > -1) {
      this.inactivityCallbacks.splice(index, 1);
    }
  }
  
  removeActivityCallback(callback) {
    const index = this.activityCallbacks.indexOf(callback);
    if (index > -1) {
      this.activityCallbacks.splice(index, 1);
    }
  }
}

// Globale Instanzen erstellen - aber erst wenn NAF bereit ist
let userDisconnectionDetector = null;
let userActivityTracker = null;

// Initialisierung verzögern bis NAF bereit ist
const initializeMonitoring = () => {
  if (typeof NAF !== 'undefined' && (NAF.clientId || document.readyState === 'complete')) {
    console.log('Initializing user monitoring...');
    userDisconnectionDetector = new UserDisconnectionDetector();
    userActivityTracker = new UserActivityTracker();
    console.log('User monitoring initialized');
  } else {
    console.log('Waiting for NAF to be ready...');
    setTimeout(initializeMonitoring, 1000);
  }
};

// Verschiedene Initialisierungspunkte versuchen
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeMonitoring);
} else {
  initializeMonitoring();
}

// Backup: auch auf NAF connected event hören
document.addEventListener('connected', () => {
  if (!userDisconnectionDetector) {
    console.log('NAF connected, initializing monitoring...');
    initializeMonitoring();
  }
});

// A-Frame Komponente für Disconnection Monitoring
if (typeof AFRAME !== 'undefined') {
  AFRAME.registerComponent('user-disconnection-monitor', {
    schema: {
      autoCleanup: { default: true },
      cleanupDelay: { default: 1000 }, // ms delay before cleanup
      onUserDisconnected: { default: '' }, // JavaScript function as string
      logLevel: { default: 'info' } // 'none', 'info', 'debug'
    },
    
    init: function () {
      this.disconnectionHandler = this.disconnectionHandler.bind(this);
      this.connectionHandler = this.connectionHandler.bind(this);
      
      // Event listeners registrieren
      document.addEventListener('userDisconnected', this.disconnectionHandler);
      document.addEventListener('userConnected', this.connectionHandler);
      
      // Detector callback registrieren
      if (userDisconnectionDetector) {
        userDisconnectionDetector.onUserDisconnected((clientId, reason, entities) => {
          this.handleUserDisconnection(clientId, reason, entities);
        });
      } else {
        // Retry wenn detector noch nicht bereit ist
        const retrySetup = () => {
          if (userDisconnectionDetector) {
            userDisconnectionDetector.onUserDisconnected((clientId, reason, entities) => {
              this.handleUserDisconnection(clientId, reason, entities);
            });
          } else {
            setTimeout(retrySetup, 500);
          }
        };
        retrySetup();
      }
      
      if (this.data.logLevel !== 'none') {
        console.log('User disconnection monitor initialized on element:', this.el.id || 'unnamed');
      }
    },
    
    disconnectionHandler: function(evt) {
      const { clientId, reason, entities, timestamp } = evt.detail;
      
      if (this.data.logLevel === 'debug') {
        console.log('Disconnection event received:', evt.detail);
      }
      
      // Custom callback ausführen
      if (this.data.onUserDisconnected) {
        try {
          // Scope für eval vorbereiten
          const clientIdVar = clientId;
          const reasonVar = reason;
          const entitiesVar = entities;
          eval(this.data.onUserDisconnected);
        } catch (e) {
          console.error('Fehler beim Ausführen der Disconnection-Callback:', e);
        }
      }
      
      // A-Frame Event emittieren
      this.el.emit('userDisconnected', { clientId, reason, entities, timestamp });
    },
    
    connectionHandler: function(evt) {
      const { clientId, timestamp } = evt.detail;
      
      if (this.data.logLevel === 'debug') {
        console.log('Connection event received:', evt.detail);
      }
      
      // A-Frame Event emittieren
      this.el.emit('userConnected', { clientId, timestamp });
    },
    
    handleUserDisconnection: function(clientId, reason, entities) {
      if (this.data.logLevel !== 'none') {
        console.log(`User ${clientId} disconnected (${reason}), ${entities.length} entities to cleanup`);
      }
      
      if (this.data.autoCleanup) {
        setTimeout(() => {
          this.performCleanup(clientId, entities);
        }, this.data.cleanupDelay);
      }
    },
    
    performCleanup: function(clientId, entityIds) {
      entityIds.forEach(entityId => {
        const element = document.getElementById(entityId) || document.getElementById('naf-' + entityId);
        if (element) {
          if (this.data.logLevel === 'debug') {
            console.log(`Cleaning up entity ${entityId} from user ${clientId}`);
          }
          
          // Custom cleanup event emittieren
          this.el.emit('entityCleanup', { clientId, entityId, element });
          
          // Standard cleanup
          if (element.setAttribute) {
            element.setAttribute('sblove_deregister', 'entity', entityId);
          }
          
          try {
            if (element.destroy) element.destroy();
            if (element.parentNode) element.parentNode.removeChild(element);
          } catch (e) {
            console.warn('Cleanup error:', e);
          }
        }
      });
    },
    
    remove: function () {
      document.removeEventListener('userDisconnected', this.disconnectionHandler);
      document.removeEventListener('userConnected', this.connectionHandler);
    },
    
    // Public API
    getConnectedUsers: function() {
      return userDisconnectionDetector ? userDisconnectionDetector.getConnectedUsers() : [];
    },
    
    isUserConnected: function(clientId) {
      return userDisconnectionDetector ? userDisconnectionDetector.isUserConnected(clientId) : false;
    },
    
    getUserEntityCount: function(clientId) {
      return userDisconnectionDetector ? userDisconnectionDetector.getUserEntityCount(clientId) : 0;
    }
  });

  // A-Frame Komponente für Activity Monitoring
  AFRAME.registerComponent('user-activity-monitor', {
    schema: {
      inactivityThreshold: { default: 30000 }, // 30 Sekunden
      autoCleanup: { default: true },
      onInactivity: { default: '' }, // JavaScript Funktion als String
      onActivity: { default: '' }
    },
    
    init: function () {
      if (!userActivityTracker) {
        console.warn('UserActivityTracker not ready yet, retrying...');
        setTimeout(() => this.init(), 500);
        return;
      }
      
      this.el.activityTracker = userActivityTracker;
      
      // Threshold setzen
      userActivityTracker.setInactivityThreshold(this.data.inactivityThreshold);
      
      // Callbacks registrieren
      this.inactivityCallback = () => {
        console.log('User inaktiv - Element:', this.el.id);
        
        if (this.data.autoCleanup) {
          this.handleInactivity();
        }
        
        if (this.data.onInactivity) {
          try {
            eval(this.data.onInactivity);
          } catch (e) {
            console.error('Fehler beim Ausführen der Inaktivitäts-Callback:', e);
          }
        }
        
        this.el.emit('userinactive', { 
          timeSinceLastActivity: userActivityTracker.getTimeSinceLastActivity() 
        });
      };
      
      this.activityCallback = () => {
        console.log('User aktiv - Element:', this.el.id);
        
        if (this.data.onActivity) {
          try {
            eval(this.data.onActivity);
          } catch (e) {
            console.error('Fehler beim Ausführen der Aktivitäts-Callback:', e);
          }
        }
        
        this.el.emit('useractive');
      };
      
      userActivityTracker.onInactivity(this.inactivityCallback);
      userActivityTracker.onActivity(this.activityCallback);
    },
    
    handleInactivity: function() {
      // Auto-cleanup Logik für inaktive User
      if (this.el.id && (this.el.id.includes('src') || this.el.id.includes('cod'))) {
        console.log('Auto-cleanup für inaktives Element:', this.el.id);
        
        // Option 1: Element dimmen/verstecken
        this.el.setAttribute('material', 'opacity', 0.3);
        
        // Option 2: Custom Event für andere Komponenten
        this.el.emit('cleanup-requested', { reason: 'user-inactive' });
      }
    },
    
    remove: function () {
      // Callbacks entfernen beim Zerstören der Komponente
      userActivityTracker.removeInactivityCallback(this.inactivityCallback);
      userActivityTracker.removeActivityCallback(this.activityCallback);
    },
    
    // Public methods
    isUserActive: function() {
      return userActivityTracker.isUserActive();
    },
    
    getTimeSinceLastActivity: function() {
      return userActivityTracker.getTimeSinceLastActivity();
    }
  });
}

// Utility Funktionen für globale Nutzung
window.UserMonitor = {
  // Disconnection Detection
  onUserDisconnected: (callback) => {
    if (userDisconnectionDetector) {
      userDisconnectionDetector.onUserDisconnected(callback);
    } else {
      console.warn('UserDisconnectionDetector not ready yet');
    }
  },
  isUserConnected: (clientId) => {
    return userDisconnectionDetector ? userDisconnectionDetector.isUserConnected(clientId) : false;
  },
  getConnectedUsers: () => {
    return userDisconnectionDetector ? userDisconnectionDetector.getConnectedUsers() : [];
  },
  getUserEntityCount: (clientId) => {
    return userDisconnectionDetector ? userDisconnectionDetector.getUserEntityCount(clientId) : 0;
  },
  
  // Activity Tracking
  isUserActive: () => {
    return userActivityTracker ? userActivityTracker.isUserActive() : true;
  },
  getTimeSinceLastActivity: () => {
    return userActivityTracker ? userActivityTracker.getTimeSinceLastActivity() : 0;
  },
  setInactivityThreshold: (ms) => {
    if (userActivityTracker) {
      userActivityTracker.setInactivityThreshold(ms);
    }
  },
  onInactivity: (callback) => {
    if (userActivityTracker) {
      userActivityTracker.onInactivity(callback);
    }
  },
  onActivity: (callback) => {
    if (userActivityTracker) {
      userActivityTracker.onActivity(callback);
    }
  },
  
  // Cleanup
  destroyAllSourcesAndCodes: () => {
    // Alle src Elemente löschen
    if (typeof sources !== 'undefined') {
      const allSrcIds = Array.from(sources.keys());
      allSrcIds.forEach(srcId => {
        console.log('Deleting source:', srcId);
        
        let srcElement = document.getElementById(srcId);
        if (!srcElement) {
          srcElement = document.getElementById('naf-' + srcId);
        }
        
        if (srcElement) {
          srcElement.setAttribute('sblove_deregister', 'entity', srcId);
          srcElement.destroy();
          if (srcElement.parentNode) {
            srcElement.parentNode.removeChild(srcElement);
          }
        }
        
        sources.delete(srcId);
      });
    }
    
    // Alle cod Elemente löschen
    if (typeof codes !== 'undefined') {
      const allCodIds = Array.from(codes.keys());
      allCodIds.forEach(codId => {
        console.log('Deleting code:', codId);
        
        let codElement = document.getElementById(codId);
        if (!codElement) {
          codElement = document.getElementById('naf-' + codId);
        }
        
        if (codElement) {
          codElement.setAttribute('sblove_deregister', 'entity', codId);
          codElement.destroy();
          if (codElement.parentNode) {
            codElement.parentNode.removeChild(codElement);
          }
        }
        
        codes.delete(codId);
      });
    }
    
    // CodeParser ausführen
    if (typeof CodeParser === 'function') {
      CodeParser();
    }
    
    console.log('All sources and codes destroyed');
  }
};

console.log('User Monitor initialized - UserMonitor global object available');
