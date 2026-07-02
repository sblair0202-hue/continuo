import React from 'react';
import Svg, { Path, Ellipse } from 'react-native-svg';

/**
 * ContinuoMark — the canonical Continuo signal-ring logo mark, as vector.
 * Source: brand board "Group 1.svg" (approved concept). Renders crisp at any
 * size for splash, headers, and reflective moments. Three beads = the Signals.
 *
 * Official brand colors:
 *   ring / dark signal  #2F2C2C
 *   dusty blue signal   #89A8C8
 *   stone signal        #DDD7CF
 */
export function ContinuoMark({
  size = 96,
  ringColor = '#2F2C2C',
  beadBlue = '#89A8C8',
  beadDark = '#2F2C2C',
  beadStone = '#DDD7CF',
}: {
  size?: number;
  ringColor?: string;
  beadBlue?: string;
  beadDark?: string;
  beadStone?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 1200 1200" fill="none">
      <Path
        d="M607.894 148.192C857.256 152.552 1055.87 358.586 1051.52 608.373C1047.16 858.16 841.494 1057.13 592.132 1052.77C342.769 1048.4 144.156 842.371 148.509 592.584C149.104 558.412 153.467 525.191 161.194 493.312L165.229 497.962C158.102 528.428 154.075 560.113 153.508 592.671C149.203 839.705 345.625 1043.45 592.219 1047.77C838.812 1052.08 1042.21 855.32 1046.52 608.286C1050.82 361.252 854.4 157.503 607.807 153.191C562.104 152.392 517.885 158.501 476.142 170.555L472.534 166.396C515.395 153.779 560.867 147.369 607.894 148.192Z"
        fill={ringColor}
      />
      <Ellipse cx="288.468" cy="277.146" rx="33.68" ry="33.7391" fill={beadBlue} />
      <Ellipse cx="397.929" cy="201.233" rx="33.68" ry="33.7391" fill={beadDark} />
      <Path
        d="M235.14 386.8C235.14 405.433 220.061 420.539 201.46 420.539C182.859 420.539 167.78 405.433 167.78 386.8C167.78 368.166 182.859 353.061 201.46 353.061C220.061 353.061 235.14 368.166 235.14 386.8Z"
        fill={beadStone}
      />
    </Svg>
  );
}
