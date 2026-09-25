import { haptic } from './util.js';
export const go = (to) => { haptic(); location.hash = to; };
export const back = () => { haptic(); if (history.length > 1) history.back(); else location.hash = '/home'; };
