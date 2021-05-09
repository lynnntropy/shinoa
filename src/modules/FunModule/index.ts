import { Module } from "../../internal/types";
import { mergeModules } from "../../utils/modules";
import AutoreplyModule from "./AutoreplyModule";
import StorytimeModule from "./StorytimeModule";
import UsernameCounterModule from "./UsernameCounterModule";

const FunModule: Module = mergeModules([
  UsernameCounterModule,
  StorytimeModule,
  AutoreplyModule,
]);

export default FunModule;
