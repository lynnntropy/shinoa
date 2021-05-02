import { Module } from "../../types";
import { mergeModules } from "../../utils/modules";
import UsernameCounterModule from "./UsernameCounterModule";

const FunModule: Module = mergeModules([UsernameCounterModule]);

export default FunModule;
