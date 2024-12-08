/* eslint-disable no-unused-vars */
// LICENSE : MIT
"use strict";
import { parse } from "./BicepParser";
import type { TextlintPluginOptions } from "@textlint/types";

export class BicepProcessor {
    config: TextlintPluginOptions;
    extensions: Array<string>;
    constructor(config = {}) {
      this.config = config;
      this.extensions = this.config.extensions ? this.config.extensions : [];
    }

    availableExtensions() {
        return [".bicep"].concat(this.extensions);
    }

    processor(_ext: string) {
        return {
            preProcess(text: string, _filePath?: string) {
                return parse(text);
            },
            postProcess(messages: any[], filePath?: string) {
                return {
                    messages,
                    filePath: filePath ? filePath : "<bicep>"
                };
            }
        };
    }
}