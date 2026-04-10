import { cssVarV2 } from '@toeverything/theme/v2';
import { style } from '@vanilla-extract/css';

export const container = style({
  width: 390,
  maxWidth: '100%',
  height: 400,
  display: 'flex',
  flexDirection: 'column',
});

export const header = style({
  padding: '12px 12px 0px 12px',
});
export const headerContent = style({
  borderBottom: `0.5px solid ${cssVarV2.layer.insideBorder.border}`,
  display: 'flex',
  justifyContent: 'space-between',
});
export const headerNav = style({
  backgroundColor: 'transparent',
});
export const headerNavItem = style({
  marginBottom: 6,
  fontSize: 14,
});

export const main = style({
  height: 0,
  flexGrow: 1,
});

export const uploadPanel = style({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: 12,
  padding: 16,
});

export const uploadButton = style({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: 8,
  padding: '6px 12px',
  background: cssVarV2.button.primary,
  color: cssVarV2.button.pureWhiteText,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
});

export const uploadInput = style({
  display: 'none',
});

export const uploadHint = style({
  color: cssVarV2.text.secondary,
  fontSize: 12,
});
