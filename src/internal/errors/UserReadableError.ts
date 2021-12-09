class UserReadableError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, UserReadableError.prototype);

    this.name = "UserReadableError";
  }
}

export default UserReadableError;
