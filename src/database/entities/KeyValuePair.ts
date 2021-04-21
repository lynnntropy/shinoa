import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity()
class KeyValuePair {
  @PrimaryColumn()
  key: string;

  @Column("jsonb")
  value: unknown;
}

export default KeyValuePair;
