/** The parts of Notion's API objects this sync reads. Only what is used is typed. */

export interface RichText {
  plain_text: string;
  href: string | null;
  annotations: { bold: boolean; italic: boolean; code: boolean };
}

export interface Block {
  id: string;
  type: string;
  has_children: boolean;
  /** Filled in by the client for blocks that have children. */
  children?: Block[];
  // The block's payload lives under a key named after its type (paragraph, heading_2, image, ...).
  [key: string]: unknown;
}

export interface PageInfo {
  id: string;
  url: string;
  /** The page's cover picture: a signed, short-lived link when uploaded to Notion. */
  cover?: { type: string; file?: { url: string }; external?: { url: string } } | null;
  properties: Record<string, { type: string; [key: string]: unknown }>;
}
