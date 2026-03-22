import { PrismaClient } from "../src/generated/prisma/client.js";
import { adapter } from "./adapter.js";
import { hashPasswordExtension } from "./extensions/hashPassword.js";

const prisma = new PrismaClient({ adapter }).$extends(hashPasswordExtension);

export default prisma;