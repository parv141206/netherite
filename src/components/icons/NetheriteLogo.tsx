import React from "react";

interface NetheriteLogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function NetheriteLogo({
  size = 24,
  className = "",
  fill = "currentColor",
  ...props
}: NetheriteLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 343 703"
      fill={fill}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMid meet"
      {...props}
    >
      <polygon points="265,0 343,112 333,611 258,563 156,349 159,598 123,703 77,561 71,205 0,165 72,164 151,131 259,408" />
    </svg>
  );
}
