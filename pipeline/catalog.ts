/* The books the tool knows. Every one is public domain in the US, so the full text
   can be downloaded from Project Gutenberg and given to the model. */

export type CatalogBook = {
  id: string;
  gutenbergId: number;
  title: string;
  author: string;
  year: number;
  /** Grades the book is usually taught in. Separate from reading level: see README. */
  grades: [number, number];
  /** Matches a chapter heading on its own line in the Gutenberg text. */
  chapterHeading: RegExp;
};

export const catalog: CatalogBook[] = [
  {
    id: "wizard-of-oz",
    gutenbergId: 55,
    title: "The Wonderful Wizard of Oz",
    author: "L. Frank Baum",
    year: 1900,
    grades: [3, 5],
    chapterHeading: /^Chapter [IVXL]+\.?$/,
  },
  {
    id: "christmas-carol",
    gutenbergId: 46,
    title: "A Christmas Carol",
    author: "Charles Dickens",
    year: 1843,
    grades: [6, 8],
    chapterHeading: /^STAVE [IV]+:\s+.+$/,
  },
  {
    id: "call-of-the-wild",
    gutenbergId: 215,
    title: "The Call of the Wild",
    author: "Jack London",
    year: 1903,
    grades: [6, 8],
    chapterHeading: /^Chapter [IVX]+\.? .+$/,
  },
  {
    id: "jekyll-and-hyde",
    gutenbergId: 43,
    title: "Strange Case of Dr Jekyll and Mr Hyde",
    author: "Robert Louis Stevenson",
    year: 1886,
    grades: [9, 12],
    chapterHeading:
      /^(STORY OF THE DOOR|SEARCH FOR MR\. HYDE|DR\. JEKYLL WAS QUITE AT EASE|THE CAREW MURDER CASE|INCIDENT OF THE LETTER|INCIDENT OF DR\. LANYON|INCIDENT AT THE WINDOW|THE LAST NIGHT|DR\. LANYON’S NARRATIVE|HENRY JEKYLL’S FULL STATEMENT OF THE CASE)$/,
  },
  {
    id: "great-gatsby",
    gutenbergId: 64317,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    year: 1925,
    grades: [10, 12],
    // Indented numerals are chapters; the table of contents lists them unindented.
    chapterHeading: /^ {10,}(I|II|III|IV|V|VI|VII|VIII|IX)$/,
  },
];
