import { Entity, PrimaryColumn, Column } from "typeorm";
import { UserType } from "@models/UserType";
import { NetworkDAO } from "@dao/NetworkDAO";

@Entity("users")
export class UserDAO {
  @PrimaryColumn({ nullable: false })
  username: string;

  @Column({ nullable: false })
  password: string;

  @Column({ nullable: false })
  type: UserType;
}
