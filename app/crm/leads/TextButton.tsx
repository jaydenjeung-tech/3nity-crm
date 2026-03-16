"use client";

import type { CSSProperties } from "react";

type Props = {
  phone: string;
  style?: CSSProperties;
};

export default function TextButton({ phone, style }: Props) {
  const handleClick = () => {
    const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `sms:${phone}`;
    } else {
      alert(`데스크탑에서는 문자 앱을 직접 열 수 없어요.\n아래 번호로 문자 보내주세요:\n\n${phone}`);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 12,
        background: "#f0fdf4",
        color: "#15803d",
        border: "1px solid #bbf7d0",
        padding: "10px 12px",
        fontSize: 14,
        fontWeight: 800,
        cursor: "pointer",
        ...style,
      }}
    >
      💬 Text
    </button>
  );
}