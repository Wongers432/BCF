import { useState } from "react";
import { getItemImageUrl } from "./itemIcon.js";

export default function ItemIcon({ itemId, name, texture, size = 32 }) {
  const [errored, setErrored] = useState(false);
  const src = getItemImageUrl(itemId, texture);

  if (errored) {
    return (
      <span
        className="item-icon item-icon-fallback"
        title={name || itemId}
        style={{
          width: size,
          height: size,
          minWidth: size,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: Math.floor(size * 0.45),
          background: "rgba(0,245,255,0.08)",
          border: "1px solid rgba(0,245,255,0.25)",
          color: "rgba(0,245,255,0.5)",
          userSelect: "none",
        }}
      >
        {(name || itemId || "?")[0].toUpperCase()}
      </span>
    );
  }

  return (
    <img
      className="item-icon"
      src={src}
      alt=""
      width={size}
      height={size}
      title={name || itemId}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      style={{ minWidth: size }}
    />
  );
}
