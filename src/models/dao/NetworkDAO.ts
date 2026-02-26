import { Entity, Column, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { GatewayDAO } from "./GatewayDAO";

@Entity("networks")
export class NetworkDAO {
  @PrimaryGeneratedColumn()
  id: number; // Auto-incrementing ID

  @Column({ nullable: false })
  code: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  description?: string;

  @OneToMany(() => GatewayDAO, gateway => gateway.network, { onDelete: 'CASCADE' })
  gateways?: GatewayDAO[];
}
