import { Module } from "../../types";
import { mergeModules } from "../../utils/modules";
import StorytimeModule from "./StorytimeModule";
import UsernameCounterModule from "./UsernameCounterModule";

const FunModule: Module = mergeModules([
  UsernameCounterModule,
  StorytimeModule,
]);

export default FunModule;
