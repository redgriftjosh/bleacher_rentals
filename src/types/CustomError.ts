export class CustomError extends Error {
  constructor(title: string, message: string) {
    super(message);
    this.name = title;
  }

  public throw() {
    throw this;
  }
}
