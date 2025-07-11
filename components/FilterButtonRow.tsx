"use client"
import React from 'react';
import classNames from 'classnames';

type ButtonDefaultProps = { title: string, label: string, disabled?: boolean, onClick?: () => void }
const MainFilterButton = ({ title, label, disabled = false, onClick }: ButtonDefaultProps) => {
  const comingSoonAfter = `
      after:opacity-100 
      after:absolute 
      after:top-[-8px]
      after:left-14
      after:content-['🔜'] 
      after:text-[18px] 
      after:text-white 
      after:bg-amber-400
      after:px-2
      after:py-0.5
      after:pt-1.5
      after:rounded-full
      after:drop-shadow-md
    `
  return (
    <button 
      title={title} 
      disabled={disabled} 
      onClick={onClick}
      className={classNames(
        'px-7',
        'py-3',
        'rounded-full',
        {
          [comingSoonAfter]: disabled,
          ['bg-gray-300 bg-opacity-50']: disabled,
          ['bg-red-700']: !disabled
        }
      )}
    >
      <p className={classNames('mb-[-6px]', 'text-3xl', {
        ['grayscale opacity-50']: disabled
      })}>
        {label}
      </p>
    </button>
  )
}

export const FilterButtonRow = () => {
  type Nav = { title: string, label: string, active: boolean }
  const MAIN_NAV: Nav[] = [
    { title: 'Album', label: '💿', active: true },
    { title: 'Artists', label: '👩🏻‍🎤', active: false }
  ]

  const testEmbeddingInfrastructure = async () => {
    console.log('🧪 Testing Vinyl DB Embedding Infrastructure (Browser-safe)...');
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // 1. Test reading from album_embeddings
      const { data: embeddings, error: embedError } = await supabase
        .from('album_embeddings')
        .select('album_id')
        .limit(5);
      if (embedError) {
        console.log('❌ Error reading album_embeddings:', embedError.message);
      } else {
        console.log(`✅ Read ${embeddings.length} rows from album_embeddings`);
      }

      // 2. Test semantic search function
      try {
        const { data: searchResult, error: searchError } = await supabase.functions.invoke('semantic-search', {
          body: {
            query: "Dark Side of the Moon",
            searchType: "combined",
            limit: 2,
            similarityThreshold: 0.7
          }
        });
        if (searchError) {
          console.log('❌ Semantic search error:', searchError.message);
        } else {
          console.log('✅ Semantic search function working');
          console.log('   Results:', searchResult);
        }
      } catch (searchError) {
        console.log('❌ Semantic search function not available:', searchError);
      }

      // 3. Test batch embeddings function
      try {
        const { data: batchResult, error: batchError } = await supabase.functions.invoke('batch-embeddings', {
          body: {
            type: "albums",
            limit: 1,
            offset: 0
          }
        });
        if (batchError) {
          console.log('❌ Batch embeddings error:', batchError.message);
        } else {
          console.log('✅ Batch embeddings function working');
          console.log('   Result:', batchResult);
        }
      } catch (batchError) {
        console.log('❌ Batch embeddings function not available:', batchError);
      }

      console.log('\n🎉 Embedding infrastructure test completed!');
      console.log('Check the Network tab to see the API calls made.');
    } catch (error) {
      console.error('❌ Test failed:', error);
      console.log('Make sure your Supabase environment variables are set correctly.');
    }
  };

  const MainFilters = () => (
    <ul className={'flex flex-row gap-2 my-auto'}>
      {MAIN_NAV.map((s, i) =>
        <li key={`${i}-mainNav`} className={classNames({
          ['relative']: !s.active
        })}>
          <MainFilterButton title={s.title} label={s.label} disabled={!s.active}/>
        </li>
      )}
      <li className="ml-4">
        <MainFilterButton 
          title="Test Embedding Infrastructure" 
          label="🧪" 
          disabled={false}
          onClick={testEmbeddingInfrastructure}
        />
      </li>
    </ul>
  );

  return (
    <nav className={'flex flex-row w-full ml-8 content-center'}>
      <MainFilters />
    </nav>
  );
};
