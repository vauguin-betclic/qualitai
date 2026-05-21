declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      session: { accessToken: string; login: string } | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
