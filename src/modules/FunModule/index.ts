import { Module } from "../../internal/types";
import { mergeModules } from "../../utils/modules";
import AutoreplyModule from "./AutoreplyModule";
import StorytimeModule from "./StorytimeModule";
import UsernameCounterModule from "./UsernameCounterModule";
import WeebModule from "./WeebModule";

const FunModule: Module = mergeModules([
  UsernameCounterModule,
  StorytimeModule,
  AutoreplyModule,
  WeebModule,
]);

export default FunModule;
