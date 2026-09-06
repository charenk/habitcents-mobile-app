/**
 * Filled tab glyphs: the two tab icons lucide cannot fill on its own.
 *
 * The tab bar marks its selected tab by filling the glyph (see TabBarIcon).
 * lucide forwards a `fill` prop onto every subpath, which is all Sun and
 * LayoutGrid need: Sun's centre is a closed circle and LayoutGrid is four
 * rects, so filling them uses lucide's own geometry and the silhouette cannot
 * drift from the outline it replaces.
 *
 * Wallet and TrendingUp are drawn as open paths, and an open path that gets a
 * fill is closed implicitly by the renderer: the wallet collapses into two
 * lumps and the trend line into a pair of wedges. So those two are authored
 * here, tracing lucide's own vertices so the focus swap changes the glyph's
 * weight and never its shape.
 *
 * Rules for anything added here:
 *  - `color` always comes from the caller (React Navigation's tint). A
 *    hard-coded sage would break theming and the grayscale contract at once.
 *  - viewBox stays 0 0 24 24, lucide's frame, so a filled glyph sits at the
 *    same optical size as the outline glyphs beside it.
 *  - no motion, no state: these are static shapes.
 */
import Svg, { Path } from 'react-native-svg';

export type FilledGlyphProps = {
  color: string;
  size: number;
};

/**
 * Wallet, filled. Body plus the rolled top lip lucide draws from (5,3), with
 * the clasp punched out by the even-odd rule rather than painted in the
 * background colour, so the glyph stays correct on any surface.
 */
export function WalletFilled({ color, size }: FilledGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* The folded top edge. Separate from the body so the two shapes can
          overlap without the even-odd rule cancelling them into a hole. */}
      <Path d="M5 3h13a1 1 0 0 1 1 1v3H5a2 2 0 0 1 0-4Z" fill={color} />
      <Path
        d="M3 7h17a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V7Zm13 7a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0Z"
        fill={color}
        fillRule="evenodd"
      />
    </Svg>
  );
}

/**
 * Trending up, filled. The arrowhead becomes a solid triangle on lucide's own
 * corner points, and the trend line keeps its vertices at a heavier weight:
 * a genuinely filled polyline has no area, so mass has to come from the stroke.
 */
export function TrendingUpFilled({ color, size }: FilledGlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M15 6.5h7v7Z" fill={color} />
      {/* Starts inside the arrowhead so the two read as one mark. */}
      <Path
        d="M20 8.5L13.5 15L8.5 10L2 17"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
