export type FormattedBleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  hitchType: string | null;
  vinNumber: string | null;
  tagNumber: string | null;
  manufacturer: string | null;
  heightFoldedFt: number | null;
  gvwr: number | null;
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
