import { Head } from "$fresh/runtime.ts";
import SpaceInvadersWebGL from "../islands/SpaceInvadersWebGL.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Space Invaders WebGL</title>
        <meta
          name="description"
          content="WebGL-powered Space Invaders game built with a custom game engine"
        />
        <style>
          {`
          body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #0f0;
            font-family: 'Courier New', monospace;
          }
          * {
            box-sizing: border-box;
          }
        `}
        </style>
      </Head>
      <SpaceInvadersWebGL />
    </>
  );
}
