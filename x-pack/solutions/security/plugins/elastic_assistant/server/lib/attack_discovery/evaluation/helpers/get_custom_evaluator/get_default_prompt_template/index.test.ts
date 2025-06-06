/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDefaultPromptTemplate } from '.';

describe('getDefaultPromptTemplate', () => {
  it('returns the expected prompt template', () => {
    const expectedTemplate = `Evaluate based on how well the following submission follows the specified rubric. Grade only based on the rubric and "expected response":

[BEGIN rubric]
1. Is the submission non-empty and not null?
2. Is the submission well-formed JSON?
3. Evaluate the "detailsMarkdown" field of all "attackDiscoveries" in the submission JSON. Do the values of "detailsMarkdown" in the submission capture the overall essence of the "expected response", regardless of the order in which they appear? Slight differences in details are acceptable as long as the overall intent and meaning remain consistent, and no key incidents are omitted or misrepresented.
4. Evaluate the value of the "entitySummaryMarkdown" field of all the "attackDiscoveries" in the submission JSON. Does the submission mention at least half of the same entities (i.e. either host or user) as in the "expected response"?
5. Evaluate the value of the "summaryMarkdown" field of all the "attackDiscoveries" in the submission JSON. Are the values of "summaryMarkdown" in the "submission" at least partially similar to that of the "expected response", regardless of the order in which they appear, and summarize the same incident(s)? Summarize each summary, and explain your answer with lettered steps.
6. Evaluate the value of the "title" field of all the "attackDiscoveries" in the submission json. Are the "title" values in the submission at least partially similar to the title(s) of the "expected response", regardless of the order in which they appear, and mention the same incident(s)?
7. Compare the submission json and the expected response json. Do over half of "alertIds" field in the "attackDiscoveries" in the submission .json overlap with the "alertsIds" field in the expected responses .json? Respond with yes or no.
[END rubric]

[BEGIN DATA]
{input}
[BEGIN submission]
{output}
[END submission]
[BEGIN expected response]
{reference}
[END expected response]
[END DATA]

{criteria} Base your answer based on all the grading rubric items. If at least 5 of the 7 rubric items are correct, consider the submission correct. Write out your explanation for each criterion in the rubric, first in detail, then as a separate summary on a new line.

Then finally respond with a single character, 'Y' or 'N', on a new line without any preceding or following characters. It's important that only a single character appears on the last line.`;

    const result = getDefaultPromptTemplate();

    expect(result).toBe(expectedTemplate);
  });
});
