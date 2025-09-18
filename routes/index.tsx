import { Head } from "$fresh/runtime.ts";
import SpaceInvaders from "../islands/SpaceInvaders.tsx";

export default function Home() {
  return (
    <>
      <Head>
        <title>Space Invaders</title>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            background: #000;
            color: #0f0;
            font-family: monospace;
          }
        `}</style>
      </Head>
      <SpaceInvaders />
    </>
  );
}
