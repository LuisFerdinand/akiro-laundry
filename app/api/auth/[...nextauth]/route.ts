// app/api/auth/[...nextauth]/route.ts
// In Auth.js v5 the route handler is just a re-export of the handlers from auth.ts
import { handlers } from "@/auth";
export const { GET, POST } = handlers;