import React from "react";

type Props = {
  size?: number;
};

export default function Spinner({ size = 32 }: Props) {
  return (
    <>
      <div
        style={{
          width: size,
          height: size,
          border: "3px solid rgba(255,255,255,0.25)",
          borderTopColor: "#4fc3f7",
          borderRadius: "50%",
          animation: "happy-hour-code-spin 0.8s linear infinite",
        }}
      />
      <style>{`@keyframes happy-hour-code-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
