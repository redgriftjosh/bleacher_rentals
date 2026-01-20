export type FormattedBleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
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
