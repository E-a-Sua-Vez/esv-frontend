<template>
  <div class="markdown-editor-container">
    <div class="markdown-editor-toolbar mb-2">
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary me-1"
        @click="insertText('**', '**')"
        :title="$t('lgpd.consent.admin.markdownEditor.bold')"
      >
        <i class="bi bi-type-bold"></i>
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary me-1"
        @click="insertText('*', '*')"
        :title="$t('lgpd.consent.admin.markdownEditor.italic')"
      >
        <i class="bi bi-type-italic"></i>
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary me-1"
        @click="insertText('- ', '')"
        :title="$t('lgpd.consent.admin.markdownEditor.list')"
      >
        <i class="bi bi-list-ul"></i>
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary me-1"
        @click="insertText('1. ', '')"
        :title="$t('lgpd.consent.admin.markdownEditor.orderedList')"
      >
        <i class="bi bi-list-ol"></i>
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-secondary me-1"
        @click="insertText('[', '](url)')"
        :title="$t('lgpd.consent.admin.markdownEditor.link')"
      >
        <i class="bi bi-link"></i>
      </button>
      <button
        type="button"
        class="btn btn-sm btn-outline-danger me-1"
        @click="clearText"
        :title="$t('lgpd.consent.admin.markdownEditor.clear')"
      >
        <i class="bi bi-x-circle"></i> {{ $t('lgpd.consent.admin.markdownEditor.clear') }}
      </button>
      <div class="btn-group ms-auto" role="group">
        <button
          type="button"
          class="btn btn-sm"
          :class="viewMode === 'edit' ? 'btn-primary' : 'btn-outline-secondary'"
          @click="viewMode = 'edit'"
        >
          <i class="bi bi-pencil"></i> {{ $t('lgpd.consent.admin.markdownEditor.edit') }}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="viewMode === 'preview' ? 'btn-primary' : 'btn-outline-secondary'"
          @click="viewMode = 'preview'"
        >
          <i class="bi bi-eye"></i> {{ $t('lgpd.consent.admin.markdownEditor.preview') }}
        </button>
        <button
          type="button"
          class="btn btn-sm"
          :class="viewMode === 'split' ? 'btn-primary' : 'btn-outline-secondary'"
          @click="viewMode = 'split'"
        >
          <i class="bi bi-layout-split"></i> {{ $t('lgpd.consent.admin.markdownEditor.split') }}
        </button>
      </div>
    </div>
    <div class="markdown-editor-content">
      <div v-if="viewMode === 'edit' || viewMode === 'split'" class="markdown-editor-edit">
        <textarea
          ref="textareaRef"
          class="form-control-modern"
          :value="modelValue"
          @input="handleInput"
          :rows="rows"
          :placeholder="placeholder"
        ></textarea>
      </div>
      <div v-if="viewMode === 'preview' || viewMode === 'split'" class="markdown-editor-preview">
        <div class="markdown-preview-content" v-html="formatMarkdown(modelValue)"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'MarkdownEditor',
  props: {
    modelValue: {
      type: String,
      default: '',
    },
    rows: {
      type: Number,
      default: 8,
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const textareaRef = ref(null);
    const viewMode = ref('edit');

    const handleInput = event => {
      emit('update:modelValue', event.target.value);
    };

    const insertText = async (before, after) => {
      if (!textareaRef.value) return;

      const textarea = textareaRef.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = props.modelValue.substring(start, end);
      const newText =
        props.modelValue.substring(0, start) +
        before +
        selectedText +
        after +
        props.modelValue.substring(end);

      emit('update:modelValue', newText);

      await nextTick();
      const newCursorPos = start + before.length + selectedText.length + after.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    };

    const clearText = () => {
      emit('update:modelValue', '');
      if (textareaRef.value) {
        textareaRef.value.focus();
      }
    };

    const formatMarkdown = text => {
      if (!text) return '';

      // Simple markdown to HTML converter
      let html = text;

      // Headers
      html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
      html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
      html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

      // Bold
      html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
      html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

      // Italic
      html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
      html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

      // Links
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank">$1</a>');

      // Lists
      html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
      html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');

      // Wrap consecutive list items
      html = html.replace(/(<li>.*<\/li>\n?)+/gim, match => {
        if (match.trim().startsWith('<li>')) {
          return '<ul>' + match.trim() + '</ul>';
        }
        return match;
      });

      // Line breaks
      html = html.replace(/\n/gim, '<br>');

      // Paragraphs (simple approach)
      const lines = html.split('<br>');
      html = lines
        .map(line => {
          if (line.trim() && !line.match(/^<(h[1-6]|ul|li|a|strong|em)/)) {
            return '<p>' + line + '</p>';
          }
          return line;
        })
        .join('');

      return html;
    };

    return {
      textareaRef,
      viewMode,
      handleInput,
      insertText,
      clearText,
      formatMarkdown,
      t,
    };
  },
};
</script>

<style scoped>
.markdown-editor-container {
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background: #fff;
}

.markdown-editor-toolbar {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
  border-radius: 0.375rem 0.375rem 0 0;
}

.markdown-editor-content {
  display: flex;
  min-height: 200px;
}

.markdown-editor-edit {
  flex: 1;
  padding: 0.5rem;
}

.markdown-editor-edit textarea {
  width: 100%;
  border: none;
  resize: vertical;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.markdown-editor-preview {
  flex: 1;
  padding: 0.5rem;
  border-left: 1px solid #dee2e6;
  overflow-y: auto;
  background: #f8f9fa;
}

.markdown-preview-content {
  line-height: 1.6;
}

.markdown-preview-content h1,
.markdown-preview-content h2,
.markdown-preview-content h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.markdown-preview-content ul,
.markdown-preview-content ol {
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

.markdown-preview-content p {
  margin-bottom: 0.5rem;
}

.markdown-preview-content a {
  color: #0d6efd;
  text-decoration: underline;
}

.markdown-preview-content strong {
  font-weight: 600;
}

.markdown-preview-content em {
  font-style: italic;
}

/* Split view */
.markdown-editor-content:has(.markdown-editor-edit:only-child) .markdown-editor-edit {
  width: 100%;
}

.markdown-editor-content:has(.markdown-editor-preview:only-child) .markdown-editor-preview {
  border-left: none;
  width: 100%;
}
</style>
