class UserReadableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserReadableError";
  }
}

export default UserReadableError;
