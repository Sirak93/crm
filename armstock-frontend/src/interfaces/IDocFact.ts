import type { Component } from 'vue';

/** One fact of a document shown as a label with an icon (reason, date, supplier, ...). */
export interface IDocFact {
  key: string;
  icon: Component;
  /** What the fact is ("Date") - the tooltip and what screen readers say first. */
  label: string;
  text: string;
  /** The reason - shown in the main color. */
  primary?: boolean;
}
