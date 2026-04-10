export type FormattedBleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  deleted: boolean;
  hitchType: string | null;
  vinNumber: string | null;
  tagNumber: string | null;
  manufacturer: string | null;
  gvwr: number | null;
  heightFoldedFt: number | null;
  trailerLength: number | null;
  trailerLengthIn: number | null;
  trailerHeightIn: number | null;
  openingDirection: string | null;
  nvisPdfPath: string | null;
  summerHomeBase: {
    homeBaseUuid: string;
    homeBaseName: string;
  };
  winterHomeBase: {
    homeBaseUuid: string;
    homeBaseName: string;
  };
  summerAccountManager?: {
    accountManagerUuid: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  winterAccountManager?: {
    accountManagerUuid: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
};
