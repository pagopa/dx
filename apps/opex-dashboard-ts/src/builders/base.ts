/**
 * Base builder abstract class.
 * Defines the common interface for all dashboard builders.
 */

import type { TemplateContext } from "../core/template/context.schema.js";

import { overrideWith } from "../utils/index.js";

/**
 * Generic builder properties type extending base TemplateContext.
 */
export type BuilderProperties<
  TProps extends TemplateContext = TemplateContext,
> = TProps;

/**
 * Type for template function that takes context and returns rendered string.
 */
export type TemplateFn<TContext extends TemplateContext = TemplateContext> = (
  context: TContext,
) => string;

export abstract class Builder<
  TProps extends TemplateContext = TemplateContext,
> {
  protected properties: TProps;
  protected templateFn: TemplateFn<TProps>;

  constructor(templateFn: TemplateFn<TProps>, baseProperties: TProps) {
    this.templateFn = templateFn;
    this.properties = baseProperties;
  }

  /**
   * Package the output into a directory with additional assets.
   * Default implementation throws error - override in subclasses that support packaging.
   */

  package(
    outputPath: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    values: Partial<TProps> = {} as Partial<TProps>,
  ): void {
    throw new Error(
      `Packaging not supported for ${this.constructor.name}. Only azure-dashboard template type supports packaging.`,
    );
  }

  /**
   * Render the template by merging base properties and given values.
   */
  produce(values: Partial<TProps> = {} as Partial<TProps>): string {
    const context = overrideWith(this.properties, values);
    return this.templateFn(context);
  }

  /**
   * Get all base properties.
   */
  props(): TProps {
    return this.properties;
  }
}
