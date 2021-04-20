import { denodb } from "../../../deps.ts";

class ConfigItem extends denodb.Model {
  static table = "config";

  static fields = {
    key: { primaryKey: true, type: denodb.DataTypes.STRING },
    value: denodb.DataTypes.STRING,
  };
}

export default ConfigItem;
