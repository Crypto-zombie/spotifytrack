export const BASE_ARTIST_COLOR = 0x0f6e7a;
export const PLAYING_ARTIST_COLOR = 0xee44ab;
export const HIGHLIGHTED_ARTIST_COLOR = 0xad5303;
export const BASE_CONNECTION_COLOR = 0x2288ee;
export const ARTIST_GEOMETRY_DETAIL = 3;
export const AMBIENT_LIGHT_COLOR = 0x727272;
export const ARTIST_LABEL_TEXT_COLOR = '#f2f2f2';

export const DEFAULT_FOV = 84.4;
export const CAMERA_PIVOT_COEFFICIENT = 0.96;
export const CAMERA_OVERRIDE_TARGET_TOLERANCE = 0.02;

export const MOVEMENT_SPEED_UNITS_PER_SECOND = 3020;
export const SHIFT_SPEED_MULTIPLIER = 2.365;
export const MAX_ARTIST_PLAY_CLICK_DISTANCE = 30_000;
export const INITIAL_ORBIT_DISTANCE = 80_000;

export const PLAYING_ARTIST_LABEL_FADE_OUT_TIME_MS = 2800;

export const BASE_ARTIST_GEOMETRY_SIZE = 1.7;
export const ARTIST_GEOMETRY_OPACITY = 0.35;
export const BLOOMED_CONNECTION_OPACITY = 0.01;

export const CROSSHAIR_COLOR = 'rgba(188, 188, 188, 0.38)';
export const CROSSHAIR_WIDTH_PX = 2;

export const BLOOM_PARAMS = {
  bloomStrength: 2.45,
  bloomThreshold: 0,
  bloomRadius: 0.12,
};

export const SECONDS_BETWEEN_POSITION_UPDATES = 0.15;

export const MUSIC_FADE_IN_TIME_SECS = 0.35;
export const MUSIC_FADE_OUT_TIME_SECS = 3.6;
export const MUSIC_DISTANCE_ROLLOFF_FACTOR = 0.84;
export const SPEED_BOOST_MUSIC_DISTANCE_ROLLOFF_FACTOR = 0.6;
export const MIN_MUSIC_PLAY_TIME_SECS = 0.8;

export const getArtistSize = (
  popularity: number,
  isHighlighted: boolean,
  isPlaying: boolean
): number => {
  // Playing artists have a separate, dedicated geometry so we want to hide this one without dealing with actually removing
  // it from the instanced mesh.
  if (isPlaying) {
    return 0.001;
  }

  const x = popularity / 100;
  let size = Math.pow(Math.pow(x, 2) * 10, 2.5) + 4.89 * Math.pow(x, 6) + 41 * x + 10;
  if (isHighlighted) {
    // Avoid really huge popular artists
    if (popularity > 87) {
      size *= 1.3;
    } else if (popularity > 30) {
      size *= 2.82;
    } else if (popularity > 20) {
      size *= 3.3;
    } else {
      size *= 4;
    }
  }
  return size;
};

export const getArtistLabelScaleFactor = (
  distance: number,
  popularity: number,
  fov: number,
  isMobile: boolean
) => {
  // Scale linearly with distance just like real life
  let score = (1 / (distance * (isMobile ? 0.00015 : 0.00025))) * 0.95;

  // Apply exponential scaling with popularity
  score -= 1;
  score += (popularity / 100) * 2;

  // Make labels larger when FOV is lower to account for the zoom effect it has
  score *= 1 / Math.pow(fov / DEFAULT_FOV, 1.5);

  return Math.max(Math.min(score, 18), 0);
};

export const getArtistColor = (isHighlighted: boolean, isPlaying: boolean): number => {
  if (isPlaying) {
    return PLAYING_ARTIST_COLOR;
  }

  if (isHighlighted) {
    return HIGHLIGHTED_ARTIST_COLOR;
  }

  return BASE_ARTIST_COLOR;
};

export const getArtistFlyToDurationMs = (distance: number): number => {
  return 2500 + 1000 * (distance / 27_500);
};

export const getHighlightedArtistsIntraOpacity = (
  controlMode: 'orbit' | 'pointerlock' | 'trackball'
) => {
  return controlMode === 'orbit' ? 0.11 : 0.033;
};
