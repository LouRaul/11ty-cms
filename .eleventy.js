const htmlmin = require('html-minifier-terser');
const { DateTime } = require('luxon');
const markdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const Image = require("@11ty/eleventy-img");
const path = require("path");

module.exports = function(eleventyConfig) {
  // Passthrough copy
  eleventyConfig.addPassthroughCopy('src/admin');
  eleventyConfig.addPassthroughCopy('src/assets/images');
  eleventyConfig.addPassthroughCopy('src/assets/js');
  eleventyConfig.addPassthroughCopy({ 'src/robots.txt': '/robots.txt' });
  eleventyConfig.addPassthroughCopy({ 'src/favicon.ico': '/favicon.ico' });
  eleventyConfig.addPassthroughCopy({ 'src/_redirects': '/_redirects' });

  // Watch targets
  eleventyConfig.addWatchTarget('./src/assets/css/');
  eleventyConfig.addWatchTarget('./src/assets/js/');

  // Common date filters
  eleventyConfig.addFilter('formatDate', (date, format = 'dd LLLL yyyy') => {
    return DateTime.fromJSDate(date).toFormat(format);
  });

  eleventyConfig.addFilter('isoDate', (date) => {
    return DateTime.fromJSDate(date).toISO();
  });

  eleventyConfig.addShortcode('currentYear', () => {
    return new Date().getFullYear();
  });

  // Array manipulation filters
  eleventyConfig.addFilter('limit', (arr, limit) => {
    return arr.slice(0, limit);
  });

  eleventyConfig.addFilter('where', (arr, key, value) => {
    return arr.filter(item => item.data[key] === value);
  });

  // Related posts filter
  eleventyConfig.addFilter('relatedPosts', (posts, tags, currentUrl) => {
    if (!tags) return [];
    return posts
      .filter(post => {
        return post.url !== currentUrl && 
               post.data.tags && 
               post.data.tags.some(tag => tags.includes(tag));
      })
      .sort((a, b) => {
        const aMatches = a.data.tags.filter(tag => tags.includes(tag)).length;
        const bMatches = b.data.tags.filter(tag => tags.includes(tag)).length;
        return bMatches - aMatches || b.date - a.date;
      });
  });

  // Price formatting
  eleventyConfig.addFilter('formatPrice', (price) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price);
  });

  // Reading time
  eleventyConfig.addFilter('readingTime', (content) => {
    const wordsPerMinute = 200;
    const words = content.split(' ').length;
    return Math.ceil(words / wordsPerMinute);
  });

  // Slugify
  eleventyConfig.addFilter('slugify', (str) => {
    return str
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  });

  // Collections
  eleventyConfig.addCollection('products', function(collection) {
    return collection.getFilteredByGlob('src/products/*.md')
      .sort((a, b) => {
        if (a.data.featured && !b.data.featured) return -1;
        if (!a.data.featured && b.data.featured) return 1;
        return (a.data.order || 0) - (b.data.order || 0);
      });
  });

  eleventyConfig.addCollection('featuredProducts', function(collection) {
    return collection.getFilteredByGlob('src/products/*.md')
      .filter(item => item.data.featured)
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  });

  eleventyConfig.addCollection('categories', function(collection) {
    return collection.getFilteredByGlob('src/categories/*.md')
      .sort((a, b) => (a.data.order || 0) - (b.data.order || 0));
  });

  eleventyConfig.addCollection('posts', function(collection) {
    return collection.getFilteredByGlob('src/blog/*.md')
      .sort((a, b) => b.date - a.date);
  });

  // Products by category
  eleventyConfig.addCollection('productsByCategory', function(collection) {
    const products = collection.getFilteredByGlob('src/products/*.md');
    const categories = {};
    
    products.forEach(product => {
      const category = product.data.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(product);
    });

    Object.keys(categories).forEach(category => {
      categories[category].sort((a, b) => {
        if (a.data.featured && !b.data.featured) return -1;
        if (!a.data.featured && b.data.featured) return 1;
        return (a.data.order || 0) - (b.data.order || 0);
      });
    });

    return categories;
  });

  // Post tags
  eleventyConfig.addCollection('postTags', function(collection) {
    const tags = new Set();
    collection.getFilteredByGlob('src/blog/*.md').forEach(post => {
      if (post.data.tags) {
        post.data.tags.forEach(tag => tags.add(tag));
      }
    });
    return [...tags].sort();
  });

  // Minify HTML in production
  eleventyConfig.addTransform('htmlmin', function(content, outputPath) {
    if (process.env.NODE_ENV === 'production' && outputPath?.endsWith('.html')) {
      return htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
        minifyCSS: true,
        minifyJS: true
      });
    }
    return content;
  });

  // Markdown configuration
  const markdownOptions = {
    html: true,
    breaks: true,
    linkify: true,
    typographer: true
  };

  const markdownLibrary = markdownIt(markdownOptions)
    .use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink({
        safariReaderFix: true,
        class: 'anchor-link',
        symbol: '#',
      }),
      level: [1, 2, 3],
      slugify: (s) => s
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
    });

  eleventyConfig.setLibrary('md', markdownLibrary);

  // Shortcodes
  eleventyConfig.addShortcode('image', async function(src, alt, sizes = '100vw', classes = 'w-full h-auto') {
    if (alt === undefined) {
      throw new Error(`Missing \`alt\` on myImage shortcode from: ${src}`);
    }

    let relativeSrc = src;
    if (src.startsWith('/')) {
      relativeSrc = path.join(__dirname, 'src', src);
    } else if (!src.startsWith('http')) {
      relativeSrc = path.join(path.dirname(this.page.inputPath), src);
    }

    try {
      let metadata = await Image(relativeSrc, {
        widths: [300, 600, 900, 1200, 1920],
        formats: ["avif", "webp", "jpeg"],
        outputDir: "./_site/assets/images/optimized/",
        urlPath: "/assets/images/optimized/",
      });

      let imageAttributes = {
        alt,
        sizes,
        loading: "lazy",
        decoding: "async",
        class: classes
      };

      return Image.generateHTML(metadata, imageAttributes);
    } catch (e) {
      console.error(`Error optimizing image ${relativeSrc}: ${e.message}`);
      return `<img src="${src}" alt="${alt}" class="${classes}" loading="lazy">`;
    }
  });

  eleventyConfig.addShortcode('year', () => `${new Date().getFullYear()}`);

  // Environment variables
  eleventyConfig.addShortcode('env', function(key) {
    return process.env[key];
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    passthroughFileCopy: true
  };
};