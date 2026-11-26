/**
 * Валидация форм на базе zod.
 *
 * validate(schema, req.body) возвращает либо { data }, либо { errors },
 * где errors — объект «поле → текст ошибки» для вывода в шаблоне.
 */
import { z } from 'zod';

export function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { data: result.data, errors: null };

  const errors = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.') || '_form';
    errors[field] ??= issue.message;
  }
  return { data: null, errors };
}

/* ---------- Переиспользуемые правила (сообщения на казахском) ---------- */

/** Обязательная строка с обрезкой пробелов. */
export const text = (max, { min = 1, label = 'Өріс' } = {}) =>
  z
    .string({ required_error: `${label} толтырылуы керек` })
    .trim()
    .min(min, min > 1 ? `${label} кемінде ${min} таңба болуы керек` : `${label} толтырылуы керек`)
    .max(max, `${label} ${max} таңбадан аспауы керек`);

/** Необязательная строка: пустое значение превращается в null. */
export const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max, `${max} таңбадан аспауы керек`)
    .optional()
    .transform((value) => value || null);

export const email = () =>
  z.string().trim().toLowerCase().email('Email дұрыс емес').max(120);

export const phone = () =>
  z
    .string()
    .trim()
    .regex(/^[+\d\s()-]{7,20}$/, 'Телефон нөмірі дұрыс емес');

/** Целое число из строки формы. */
export const int = ({ min = 0, max = 10_000_000, label = 'Мән' } = {}) =>
  z.coerce
    .number({ invalid_type_error: `${label} сан болуы керек` })
    .int(`${label} бүтін сан болуы керек`)
    .min(min, `${label} ${min}-ден кем болмауы керек`)
    .max(max, `${label} тым үлкен`);

/** Чекбокс формы: «on»/«1»/«true» → true, отсутствие → false. */
export const checkbox = () =>
  z.preprocess((value) => ['on', '1', 'true', true].includes(value), z.boolean());

export { z };
