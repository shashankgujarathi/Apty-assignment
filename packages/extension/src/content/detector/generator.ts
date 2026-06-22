import { ElementSelectors } from '@mini-apty/shared';

//removes auto generated ID's which are not useful for selecting the element
function isStableId(id: string): boolean {
  if (!id) return false;
  // Exclude react, vue, ember, angular, and random numeric generated strings
  const dynamicRegex = /(^|\b)(react-aria-|ember-|vue-|id-|_ng|btn-|lnk-).*?[0-9]{3,}/i;
  const purelyNumeric = /^[0-9_-]+$/;
  return !dynamicRegex.test(id) && !purelyNumeric.test(id) && id.length < 50;
}

// Filters out CSS-in-JS hashes or Tailwind class utilities
function filterStableClasses(classList: DOMTokenList): string[] {
  const stableClasses: string[] = [];
  const tailwindPattern = /^(m|p|w|h|bg|text|border|flex|grid|justify|items|self|rounded|shadow|opacity|cursor|transition|duration|hover|focus|active|z|top|left|right|bottom|translate|scale|rotate)-/;
  const cssInJsHash = /^[a-z0-9]{5,10}$/i;
  const emberClass = /^ember/i;

  classList.forEach((cls) => {
    if (!tailwindPattern.test(cls) && !cssInJsHash.test(cls) && !emberClass.test(cls) && cls.length < 30) {
      stableClasses.push(cls);
    }
  });

  return stableClasses;
}

// Generates the hierarchical positional XPath
function getPositionalXPath(element: HTMLElement): string {
  const paths: string[] = [];
  let current: Node | null = element;

  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    paths.unshift(`${tagName}[${index}]`);
    current = current.parentNode;
  }

  return `/${paths.join('/')}`;
}

// Main Selector Generator
export function generateSelectors(element: HTMLElement): ElementSelectors {
  const tagName = element.tagName;
  const dataAttributes: Record<string, string> = {};

  // Gather test-ids and common semantic attributes
  const targetAttributes = ['data-testid', 'data-test', 'data-qa', 'data-cy', 'data-apty', 'data-action', 'data-target', 'name', 'placeholder'];
  targetAttributes.forEach((attr) => {
    const val = element.getAttribute(attr);
    if (val) {
      dataAttributes[attr] = val;
    }
  });

  // Check for stable ID
  const rawId = element.id;
  const idSelector = isStableId(rawId) ? `#${rawId}` : undefined;

  // Compile clean stable classes
  const stableClasses = filterStableClasses(element.classList);
  const classSelector = stableClasses.length > 0 ? `.${stableClasses.join('.')}` : undefined;

  // Capture text content if short and semantic
  const textContent = element.textContent?.trim() || '';
  const cleanText = textContent.length > 0 && textContent.length < 100 ? textContent : undefined;

  // Build primary robust CSS Selector
  let robustSelector = '';

  // Priority 1: Semantic custom attributes
  const testAttr = ['data-testid', 'data-test', 'data-qa', 'data-cy', 'data-apty'].find(attr => !!dataAttributes[attr]);
  if (testAttr) {
    robustSelector = `${tagName.toLowerCase()}[${testAttr}="${dataAttributes[testAttr]}"]`;
  }
  // Priority 2: Stable ID
  else if (idSelector) {
    robustSelector = idSelector;
  }
  // Priority 3: Form Inputs with names
  else if ((tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') && dataAttributes['name']) {
    robustSelector = `${tagName.toLowerCase()}[name="${dataAttributes['name']}"]`;
  }
  // Priority 4: Stable classes + tags
  else if (classSelector) {
    robustSelector = `${tagName.toLowerCase()}${classSelector}`;
  }
  // Priority 5: Fallback to tag name and hierarchical chain up to 3 parent nodes
  else {
    const parts: string[] = [];
    let current: HTMLElement | null = element;
    let depth = 0;

    while (current && current.tagName && depth < 3) {
      const tag = current.tagName.toLowerCase();
      const currentId = current.id;
      const currentClasses = filterStableClasses(current.classList);

      if (isStableId(currentId)) {
        parts.unshift(`#${currentId}`);
        break; // Unique anchor found, stop climbing
      } else if (currentClasses.length > 0) {
        parts.unshift(`${tag}.${currentClasses[0]}`);
      } else {
        parts.unshift(tag);
      }

      current = current.parentElement;
      depth++;
    }
    robustSelector = parts.join(' > ');
  }

  // Full path for fallback
  const positionalXPath = getPositionalXPath(element);

  return {
    idSelector,
    dataAttributes,
    classSelector,
    tagName,
    textContent: cleanText,
    positionalXPath,
    robustSelector,
  };
}
