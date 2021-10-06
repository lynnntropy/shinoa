import { format } from "date-fns";

export const formatDate = (date: Date) =>
  format(date, "MMM do yyyy, K:mm aaa (z)");
