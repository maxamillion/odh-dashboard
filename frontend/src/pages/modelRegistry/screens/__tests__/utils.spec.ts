/* eslint-disable camelcase */
import { mockModelVersion } from '~/__mocks__/mockModelVersion';
import { mockRegisteredModel } from '~/__mocks__/mockRegisteredModel';
import {
  ModelRegistryCustomProperties,
  ModelRegistryStringCustomProperties,
  ModelRegistryMetadataType,
  RegisteredModel,
  ModelVersion,
  ModelState,
} from '~/concepts/modelRegistry/types';
import {
  filterModelVersions,
  getLabels,
  getProperties,
  mergeUpdatedProperty,
  mergeUpdatedLabels,
  filterRegisteredModels,
  sortModelVersionsByCreateTime,
  isValidHttpUrl,
  filterCustomProperties,
  isPipelineRunExist,
  isRedHatRegistryUri,
} from '~/pages/modelRegistry/screens/utils';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { pipelineRunSpecificKeys } from '~/pages/modelRegistry/screens/ModelVersionDetails/const';

describe('getLabels', () => {
  it('should return an empty array when customProperties is empty', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = getLabels(customProperties);
    expect(result).toEqual([]);
  });

  it('should return an array of keys with empty string values in customProperties', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      label3: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
    };
    const result = getLabels(customProperties);
    expect(result).toEqual(['label1', 'label3']);
  });

  it('should return an empty array when all values in customProperties are non-empty strings', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'another-non-empty' },
    };
    const result = getLabels(customProperties);
    expect(result).toEqual([]);
  });
});

describe('mergeUpdatedLabels', () => {
  it('should return an empty object when customProperties and updatedLabels are empty', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = mergeUpdatedLabels(customProperties, []);
    expect(result).toEqual({});
  });

  it('should return an unmodified object if updatedLabels match existing labels', () => {
    const customProperties: ModelRegistryCustomProperties = {
      someUnrelatedProp: { string_value: 'foo', metadataType: ModelRegistryMetadataType.STRING },
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label1']);
    expect(result).toEqual(customProperties);
  });

  it('should return an object with labels added', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = mergeUpdatedLabels(customProperties, ['label1', 'label2']);
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should return an object with labels removed', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label4: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label2', 'label4']);
    expect(result).toEqual({
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label4: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should return an object with labels both added and removed', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label1', 'label3', 'label4']);
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label4: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should not affect non-label properties on the object', () => {
    const customProperties: ModelRegistryCustomProperties = {
      someUnrelatedStrProp: { string_value: 'foo', metadataType: ModelRegistryMetadataType.STRING },
      someUnrelatedIntProp: { int_value: '3', metadataType: ModelRegistryMetadataType.INT },
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedLabels(customProperties, ['label2', 'label3']);
    expect(result).toEqual({
      someUnrelatedStrProp: { string_value: 'foo', metadataType: ModelRegistryMetadataType.STRING },
      someUnrelatedIntProp: { int_value: '3', metadataType: ModelRegistryMetadataType.INT },
      label2: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      label3: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });
});

describe('getProperties', () => {
  it('should return an empty object when customProperties is empty', () => {
    const customProperties: ModelRegistryCustomProperties = {};
    const result = getProperties(customProperties);
    expect(result).toEqual({});
  });

  it('should return a filtered object including only string properties with a non-empty value', () => {
    const customProperties: ModelRegistryCustomProperties = {
      property1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      property2: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'another-non-empty',
      },
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      int1: { metadataType: ModelRegistryMetadataType.INT, int_value: '1' },
      int2: { metadataType: ModelRegistryMetadataType.INT, int_value: '2' },
    };
    const result = getProperties(customProperties);
    expect(result).toEqual({
      property1: { metadataType: ModelRegistryMetadataType.STRING, string_value: 'non-empty' },
      property2: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'another-non-empty',
      },
    } satisfies ModelRegistryStringCustomProperties);
  });

  it('should return an empty object when all values in customProperties are empty strings or non-string values', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      label2: { metadataType: ModelRegistryMetadataType.STRING, string_value: '' },
      int1: { metadataType: ModelRegistryMetadataType.INT, int_value: '1' },
      int2: { metadataType: ModelRegistryMetadataType.INT, int_value: '2' },
    };
    const result = getProperties(customProperties);
    expect(result).toEqual({});
  });
});

describe('mergeUpdatedProperty', () => {
  it('should handle the create operation', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'create',
      newPair: { key: 'prop2', value: 'val2' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
      prop2: { string_value: 'val2', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should handle the update operation without a key change', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'update',
      oldKey: 'prop1',
      newPair: { key: 'prop1', value: 'updatedVal1' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'updatedVal1', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should handle the update operation with a key change', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'update',
      oldKey: 'prop1',
      newPair: { key: 'prop2', value: 'val2' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop2: { string_value: 'val2', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should perform a create if using the update operation with an invalid oldKey', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'update',
      oldKey: 'prop2',
      newPair: { key: 'prop3', value: 'val3' },
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
      prop3: { string_value: 'val3', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should handle the delete operation', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
      prop2: { string_value: 'val2', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'delete',
      oldKey: 'prop2',
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });

  it('should do nothing if using the delete operation with an invalid oldKey', () => {
    const customProperties: ModelRegistryCustomProperties = {
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    };
    const result = mergeUpdatedProperty({
      customProperties,
      op: 'delete',
      oldKey: 'prop2',
    });
    expect(result).toEqual({
      label1: { string_value: '', metadataType: ModelRegistryMetadataType.STRING },
      prop1: { string_value: 'val1', metadataType: ModelRegistryMetadataType.STRING },
    } satisfies ModelRegistryCustomProperties);
  });
});

describe('filterModelVersions', () => {
  const modelVersions: ModelVersion[] = [
    mockModelVersion({ name: 'Test 1', state: ModelState.ARCHIVED }),
    mockModelVersion({
      name: 'Test 2',
      description: 'Description2',
    }),
    mockModelVersion({ name: 'Test 3', author: 'Author3', state: ModelState.ARCHIVED }),
    mockModelVersion({ name: 'Test 4', state: ModelState.ARCHIVED }),
    mockModelVersion({ name: 'Test 5' }),
  ];

  test('filters by name', () => {
    const filtered = filterModelVersions(modelVersions, 'Test 1', SearchType.KEYWORD);
    expect(filtered).toEqual([modelVersions[0]]);
  });

  test('filters by description', () => {
    const filtered = filterModelVersions(modelVersions, 'Description2', SearchType.KEYWORD);
    expect(filtered).toEqual([modelVersions[1]]);
  });

  test('filters by author', () => {
    const filtered = filterModelVersions(modelVersions, 'Author3', SearchType.AUTHOR);
    expect(filtered).toEqual([modelVersions[2]]);
  });

  test('does not filter when search is empty', () => {
    const filtered = filterModelVersions(modelVersions, '', SearchType.KEYWORD);
    expect(filtered).toEqual(modelVersions);
  });
});

describe('filterRegisteredModels', () => {
  const registeredModels: RegisteredModel[] = [
    mockRegisteredModel({ name: 'Test 1', state: ModelState.ARCHIVED, owner: 'Alice' }),
    mockRegisteredModel({
      name: 'Test 2',
      description: 'Description2',
      owner: 'Bob',
    }),
    mockRegisteredModel({ name: 'Test 3', state: ModelState.ARCHIVED, owner: 'Charlie' }),
    mockRegisteredModel({ name: 'Test 4', state: ModelState.ARCHIVED, owner: 'Alice' }),
    mockRegisteredModel({ name: 'Test 5', owner: 'Bob' }),
  ];

  test('filters by name', () => {
    const filtered = filterRegisteredModels(registeredModels, [], 'Test 1', SearchType.KEYWORD);
    expect(filtered).toEqual([registeredModels[0]]);
  });

  test('filters by description', () => {
    const filtered = filterRegisteredModels(
      registeredModels,
      [],
      'Description2',
      SearchType.KEYWORD,
    );
    expect(filtered).toEqual([registeredModels[1]]);
  });

  test('filters by owner', () => {
    const filtered = filterRegisteredModels(registeredModels, [], 'Alice', SearchType.OWNER);
    expect(filtered).toEqual([registeredModels[0], registeredModels[3]]);
  });

  test('does not filter when search is empty', () => {
    const filtered = filterRegisteredModels(registeredModels, [], '', SearchType.KEYWORD);
    expect(filtered).toEqual(registeredModels);
  });
});

describe('sortModelVersionsByCreateTime', () => {
  it('should return list of sorted modelVersions by create time', () => {
    const modelVersions: ModelVersion[] = [
      mockModelVersion({
        name: 'model version 1',
        author: 'Author 1',
        id: '1',
        createTimeSinceEpoch: '1725018764650',
        lastUpdateTimeSinceEpoch: '1725030215299',
      }),
      mockModelVersion({
        name: 'model version 1',
        author: 'Author 1',
        id: '1',
        createTimeSinceEpoch: '1725028468207',
        lastUpdateTimeSinceEpoch: '1725030142332',
      }),
    ];

    const result = sortModelVersionsByCreateTime(modelVersions);
    expect(result).toEqual([modelVersions[1], modelVersions[0]]);
  });
});

describe('isValidHttpUrl', () => {
  it('should return true for a valid HTTPS URL', () => {
    expect(isValidHttpUrl('https://example.com')).toBe(true);
  });

  it('should return true for a valid HTTP URL', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
  });

  it('should return false for a URL with an unsupported protocol', () => {
    expect(isValidHttpUrl('ftp://example.com')).toBe(false);
  });

  it('should return false for an invalid URL string', () => {
    expect(isValidHttpUrl('random text')).toBe(false);
  });

  it('should return false for an empty string', () => {
    expect(isValidHttpUrl('')).toBe(false);
  });

  it('should return false for a string without a protocol', () => {
    expect(isValidHttpUrl('www.example.com')).toBe(false);
  });

  it('should return false for null input', () => {
    expect(isValidHttpUrl(null as unknown as string)).toBe(false);
  });

  it('should return false for undefined input', () => {
    expect(isValidHttpUrl(undefined as unknown as string)).toBe(false);
  });

  it('should return false for a number input', () => {
    expect(isValidHttpUrl(12345 as unknown as string)).toBe(false);
  });

  it('should return false for a URL with a missing domain', () => {
    expect(isValidHttpUrl('http://')).toBe(false);
  });

  it('should return false for a URL with an invalid format', () => {
    expect(isValidHttpUrl('http://example..com')).toBe(false);
  });
});

describe('filterCustomProperties', () => {
  it('filter pipeline specific keys from custom properties', () => {
    const customProperties: ModelRegistryCustomProperties = {
      'Label x': {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: '',
      },
      _registeredFromPipelineProject: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'test-project',
      },
      _registeredFromPipelineRunId: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'pipelinerun1',
      },
      _registeredFromPipelineRunName: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'pipeline-run-test',
      },
    };
    const result = filterCustomProperties(customProperties, pipelineRunSpecificKeys);
    expect(result).toStrictEqual({
      'Label x': {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: '',
      },
    });
  });
});

describe('isPipelineRunExist', () => {
  it('return True when pipeline run specific key exist in custom properties', () => {
    const customProperties: ModelRegistryCustomProperties = {
      'Label x': {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: '',
      },
      _registeredFromPipelineProject: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'test-project',
      },
      _registeredFromPipelineRunId: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'pipelinerun1',
      },
      _registeredFromPipelineRunName: {
        metadataType: ModelRegistryMetadataType.STRING,
        string_value: 'pipeline-run-test',
      },
    };
    const result = isPipelineRunExist(customProperties, pipelineRunSpecificKeys);
    expect(result).toEqual(true);
  });

  it('return false, when pipeline run specific key doesnot exist in custom properties', () => {
    const result = isPipelineRunExist(
      {
        'Label x': {
          metadataType: ModelRegistryMetadataType.STRING,
          string_value: '',
        },
      },
      pipelineRunSpecificKeys,
    );
    expect(result).toEqual(false);
  });
});

describe('isRedHatRegistryUri', () => {
  it('should return true for RedHat registry URI', () => {
    expect(isRedHatRegistryUri('oci://registry.redhat.io/test/test')).toBe(true);
  });

  it('should return false for non-RedHat registry URI', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true);
  });
});
