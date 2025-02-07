export const BACKEND_URL = "http://localhost:3001";
export const print = (obj: { [key: string]: unknown }) => {
  for (const key in obj) {
    console.log(key, obj[key]);
  }
};
