import { Prisma } from "../../src/generated/prisma/client.js"
import bcrypt from "bcryptjs"

export const hashPasswordExtension = Prisma.defineExtension({
    name:"hashPassword",
    query:{
        user:{
            create: async ({args, query}) => {
                try{
                    const hashedPassword = await bcrypt.hash(args.data.password, 10)
                    args.data.password = hashedPassword
                    return query(args)
                }
                catch(error){
                    throw error
                }
            }
        }
    }
})