import React, { useState, useEffect } from 'react';

interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  author: string;
  publishedAt: string;
  category: string;
  tags: string[];
}

const TechNews: React.FC = () => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        
        // Mock data - real implementation would fetch from API
        const mockArticles: NewsArticle[] = [
          {
            id: 'news-1',
            title: 'Intel 15-avlod Core protsessorlarini taqdim etdi',
            excerpt: 'Intel kompaniyasi yangi 15-avlod Core protsessorlarini elon qildi.',
            content: `Intel kompaniyasi 15-avlod Core protsessorlarini rasman taqdim etdi. Arrow Lake kodli bu protsessorlar yangi LGA1851 soketida ishlab, DDR5 xotirani qollabquvvatlaydi.

Yangi protsessorlarning asosiy xususiyatlari:
- 20 tagacha yadro (8 P-core + 12 E-core)
- PCIe 5.0 qollabquvvatlashi
- Wi-Fi 7 va Bluetooth 5.4
- Yaxshilangan AI ishlov berish`,
            image: '/images/news/intel15.jpg',
            author: 'Aziz Karimov',
            publishedAt: '2025-06-10',
            category: 'hardware',
            tags: ['Intel', 'Processor', 'CPU', 'Arrow Lake']
          },
          {
            id: 'news-2',
            title: 'AMD yangi Ryzen 9000 protsessorlarini taqdim etdi',
            excerpt: 'AMD kompaniyasi yangi Zen 5 arxitekturasi asosidagi Ryzen 9000 seriyasini elon qildi.',
            content: `AMD kompaniyasi yangi Zen 5 arxitekturasi asosidagi Ryzen 9000 seriyali protsessorlarni taqdim etdi. Bu seriyaga Ryzen 9 9950X, Ryzen 9 9900X, Ryzen 7 9800X va Ryzen 5 9600X modellari kiradi.

Yangi protsessorlar ilgari modellarga qaraganda 15% gacha tezroq ishlaydi va energiya tejamkorligi 20% ga oshgan. Barcha modellar AM5 soketiga mojallangan bolib, DDR5 xotirani qollabquvvatlaydi.`,
            image: '/images/news/amd9000.jpg',
            author: 'Muhammed Olimov',
            publishedAt: '2025-06-08',
            category: 'hardware',
            tags: ['AMD', 'Ryzen', 'Zen 5', 'Processor']
          },
          {
            id: 'news-3',
            title: 'NVIDIA RTX 5000 seriyasi taqdimlandi',
            excerpt: 'NVIDIA kompaniyasi RTX 5000 seriyasi videokartalarini elon qildi.',
            content: `NVIDIA RTX 5000 seriyasini rasman taqdim etdi. Blackwell arxitekturasiga asoslangan bu videokartalar AI va gaming sohasida yangi standartlarni joriy etadi.

RTX 5090 va RTX 5080 modellari birinchi navbatda chiqariladi:
- RTX 5090: 32GB GDDR7 xotira
- RTX 5080: 16GB GDDR7 xotira
- 4nm texnologiya jarayoni
- DLSS 4.0 qollabquvvatlashi`,
            image: '/images/news/rtx5000.jpg',
            author: 'Dilshod Rahmonov',
            publishedAt: '2025-06-06',
            category: 'hardware',
            tags: ['NVIDIA', 'RTX', 'Graphics Card', 'Blackwell']
          },
          {
            id: 'news-4',
            title: 'Google Chrome 125 versiyasi chiqarildi',
            excerpt: 'Google Chrome 125 versiyasi suniy intellekt asosidagi yangi xususiyatlar bilan yangilandi.',
            content: `Google Chrome brauzerining 125-versiyasi chiqarildi. Yangi versiyada suniy intellekt asosidagi qidiruv va kontentni tahlil qilish imkoniyatlari qoshildi.

Chrome 125 ning asosiy yangiliklari:
- AI asosidagi Smart Search funksiyasi
- Memory Saver funksiyasining yaxshilangan versiyasi
- Yangi tab guruhlash imkoniyatlari
- Xavfsizlikni oshiradigan yangiliklar`,
            image: '/images/news/chrome125.jpg',
            author: 'Bobur Alimov',
            publishedAt: '2025-06-05',
            category: 'software',
            tags: ['Google', 'Chrome', 'Browser', 'Update']
          }
        ];

        setArticles(mockArticles);
      } catch (error) {
        // Error loading articles
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  const filteredArticles = selectedCategory === 'all' 
    ? articles 
    : articles.filter(article => article.category === selectedCategory);

  const categories = ['all', 'hardware', 'software', 'mobile', 'gaming', 'ai'];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Texnologiya Yangiliklari
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          Texnologiya olamidagi eng soyoq yangiliklar va tendensiyalar bilan tanishing
        </p>
      </div>

      {/* Category Filter */}
      <div className="mb-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {category === 'all' ? 'Hammasi' : 
               category === 'hardware' ? 'Jihozlar' :
               category === 'software' ? 'Dasturlar' :
               category === 'mobile' ? 'Mobil' :
               category === 'gaming' ? 'Gaming' :
               category === 'ai' ? 'AI' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredArticles.map((article) => (
          <article
            key={article.id}
            className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className="h-48 bg-gray-200">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/400x200?text=Tech+News';
                }}
              />
            </div>
            
            <div className="p-6">
              <div className="flex items-center mb-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  {article.category === 'hardware' ? 'Jihozlar' :
                   article.category === 'software' ? 'Dasturlar' :
                   article.category === 'mobile' ? 'Mobil' :
                   article.category === 'gaming' ? 'Gaming' :
                   article.category === 'ai' ? 'AI' : article.category}
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {article.title}
              </h3>
              
              <p className="text-gray-600 mb-4 line-clamp-3">
                {article.excerpt}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{article.author}</span>
                <span>{new Date(article.publishedAt).toLocaleDateString('uz-UZ')}</span>
              </div>
              
              <div className="mt-4">
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors">
                  Batafsil oqish
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filteredArticles.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            Tanlangan kategoriyada yangiliklar topilmadi.
          </p>
        </div>
      )}
    </div>
  );
};

export default TechNews;
