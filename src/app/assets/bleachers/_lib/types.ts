export type FormattedBleacher = {
  bleacherNumber: number;
  bleacherRows: number;
  bleacherSeats: number;
  homeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
  winterHomeBase: {
    homeBaseId: number;
    homeBaseName: string;
  };
  summerAccountManager?: {
    accountManagerId: number;
    firstName: string | null;
    lastName: string | null;
  } | null;
  winterAccountManager?: {
    accountManagerId: number;
    firstName: string | null;
    lastName: string | null;
  } | null;
};
