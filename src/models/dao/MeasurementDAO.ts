import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { SensorDAO } from "./SensorDAO";

@Entity("measurement")
export class MeasurementDAO {
  @PrimaryGeneratedColumn()
  id: number; // Auto-incrementing ID

  @Column({ nullable: false })
  createdAt: Date;

  @Column({ type: "double", nullable: false })
  value: number;

  @Column({ nullable: true })
  isOutlier?: boolean;

  @ManyToOne(() => SensorDAO, sensor => sensor.measurements, { onDelete: "CASCADE" })
  sensor: SensorDAO;
}
