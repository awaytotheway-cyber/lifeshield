import type { CSSProperties, ReactNode } from "react";
import { useLink, useRefineOptions } from "@refinedev/core";

type AdminTitleProps = {
  collapsed?: boolean;
  text?: ReactNode;
  wrapperStyles?: CSSProperties;
};

/** Sidebar / header mark: LifeShield Admin (serif wordmark when expanded). */
export function AdminTitle({
  collapsed,
  text: textFromProps,
  wrapperStyles,
}: AdminTitleProps) {
  const {
    title: { text: defaultText } = {},
  } = useRefineOptions();
  const text = typeof textFromProps === "undefined" ? defaultText : textFromProps;
  const Link = useLink();

  return (
    <Link
      to="/"
      style={{
        display: "inline-block",
        textDecoration: "none",
        ...wrapperStyles,
      }}
    >
      <span className="ls-brand">
        <span className="ls-brand-mark" aria-hidden>
          LS
        </span>
        {!collapsed ? (
          <span className="ls-brand-text">{text ?? "LifeShield Admin"}</span>
        ) : null}
      </span>
    </Link>
  );
}
