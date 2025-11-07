/* global AFRAME */
import './assets/style.css';
import { render } from 'solid-js/web';
import { Show, createSignal } from 'solid-js';
import { IoSettingsOutline } from 'solid-icons/io';
import { MicButton } from './MicButton';
import { UsernameInput } from './UsernameInput';
import { ChatButton } from './Chat';
import { UsersButton } from './UsersButton';

const [showSettings, setShowSettings] = createSignal(false);
const [entered, setEntered] = createSignal(false);
const [sceneLoaded, setSceneLoaded] = createSignal(false);

const UserForm = () => {
  return (
    <div class="flex flex-col gap-2">
      <label for="username">Avatar Name:</label>
      <UsernameInput entity="#player" />
    </div>
  );
};

const SettingsScreen = () => {
  return (
    <div class="naf-centered-fullscreen">
      <UserForm />
      <button
        type="button"
        id="saveSettingsButton"
        class="btn min-w-[100px]"
        onClick={() => {
          setShowSettings(false);
        }}
      >
        Close
      </button>
    </div>
  );
};

const EnterScreen = () => {
  return (

    <div class="naf-centered-fullscreen" style="background-image: url('../assets/BannerHintergrund.png'); background-repeat: no-repeat; background-position:center;  background-size: cover;">
         <img src="../assets/LogoMap.png" style="max-width: 30%; object-position: 1% 1%;"></img>
         <div style="font-size:20px;text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"><p><b>Please use Chrome or Chromium-based browser.</b></p><p><b>If you don't hear any sound, or don't see any other users, please try to reload.</b></p>
        <p></p><p>&nbsp;</p>
 <p>
   Look around by dragging the mouse and move through the room with the WASD or arrow keys. </p>
        <p>Use headphones for better spatial audio experience.</p>
        <p>To avoid a jerky performance, an up-to-date computer with a certain graphics performance is recommended.</p>
 
        <p>Or use a VR headset of your choice for immersive experience.</p>

        <p>Jump in!</p>
        </div>

      <UserForm />
      <button
        type="button"
        id="playButton"
        class="btn min-w-[100px]"
        onClick={() => {
          const audio = new Audio(
            "enter.wav"
          );
          audio.play();
          
          setEntered(true);
          const sceneEl = document.querySelector('a-scene');
          // emit connect when the scene has loaded
          const sceneLoadedCallback = () => {
            setSceneLoaded(true);
            // @ts-ignore
            sceneEl?.emit('connect');
          };

          // @ts-ignore
          if (sceneEl.hasLoaded) {
            sceneLoadedCallback();
          } else {
            // @ts-ignore
            sceneEl.addEventListener('loaded', sceneLoadedCallback);
          }
        }}
      >
        Enter
      </button>
    </div>
  );
};

const BottomBarCenter = () => {
  return (
    <div class="naf-bottom-bar-center">
      <button
        type="button"
        id="settingsButton"
        class="btn-secondary btn-rounded"
        onClick={() => {
          setShowSettings(true);
        }}
        title="Settings"
      >
        <IoSettingsOutline size={24} />
      </button>
      <MicButton entity="#player" />
      <UsersButton />
      <ChatButton />
    </div>
  );
};

const App = () => {
  return (
    <>
      <Show when={!entered()}>
        <EnterScreen />
      </Show>
      <Show when={showSettings()}>
        <SettingsScreen />
      </Show>
      <Show when={entered() && sceneLoaded() && !showSettings()}>
        <BottomBarCenter />
      </Show>
    </>
  );
};

const root = document.createElement('div');
document.body.appendChild(root);
render(() => <App />, root);
