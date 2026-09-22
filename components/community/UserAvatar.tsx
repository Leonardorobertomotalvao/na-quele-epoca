"use client";

import { useState } from "react";

type UserAvatarProps = {
  name?: string | null;
  image?: string | null;
  size?: number;
  className?: string;
};

function getInitials(name?: string | null) {
  const cleanName = name?.trim();

  if (!cleanName) {
    return "?";
  }

  const parts = cleanName
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0].charAt(0) +
    parts[parts.length - 1].charAt(0)
  ).toUpperCase();
}

function getAvatarColor(name?: string | null) {
  const colors = [
    "#0f766e",
    "#0369a1",
    "#7c3aed",
    "#b45309",
    "#be123c",
    "#047857",
    "#4338ca",
    "#c2410c",
  ];

  const value = (name || "?")
    .split("")
    .reduce(
      (total, char) =>
        total + char.charCodeAt(0),
      0
    );

  return colors[value % colors.length];
}

export default function UserAvatar({
  name,
  image,
  size = 40,
  className = "",
}: UserAvatarProps) {
  const [imageFailed, setImageFailed] =
    useState(false);

  const showImage =
    Boolean(image) && !imageFailed;

  const initials = getInitials(name);
  const background = getAvatarColor(name);

  return (
    <div
      className={`community-user-avatar ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        backgroundColor: background,
      }}
      title={name || "Usuário"}
      aria-label={`Avatar de ${name || "usuário"}`}
    >
      {showImage ? (
        <img
          src={image!}
          alt=""
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          style={{
            fontSize: Math.max(
              12,
              Math.round(size * 0.36)
            ),
          }}
        >
          {initials}
        </span>
      )}
    </div>
  );
}
