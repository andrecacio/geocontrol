import { Entity, Column, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { NetworkDAO } from "./NetworkDAO";
import { SensorDAO } from "./SensorDAO";

@Entity("gateways")
export class GatewayDAO {
  @PrimaryGeneratedColumn()
  id: number; // Auto-incrementing ID

  @Column({ nullable: false })
  macAddress: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ nullable: true })
  description?: string;

  @ManyToOne(() => NetworkDAO, network => network.gateways, { onDelete: 'CASCADE' })
  network: NetworkDAO;

  @OneToMany(() => SensorDAO, sensor => sensor.gateway, { onDelete: 'CASCADE' })
  sensors?: SensorDAO[];
}
