import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageSquare, ThumbsUp, Star, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const FeedbackAnalyzer: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = () => {
    if (!feedback) {
      toast({ title: 'Error', description: 'Enter feedback', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setAnalysis({ sentiment: 'positive', score: 88, topics: ['service', 'quality', 'value'], insights: 'Customers love the service quality' });
      setLoading(false);
      toast({ title: 'Analysis Complete', description: 'Feedback analyzed' });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-amber-600" />
            FeedbackAnalyzer AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Customer Feedback</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Paste customer feedback..." rows={4} />
          </div>
          <Button onClick={handleAnalyze} disabled={loading} className="w-full">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing...</> : <>Analyze Feedback</>}
          </Button>
        </CardContent>
      </Card>
      {analysis && (
        <Card>
          <CardHeader><CardTitle>Analysis Results</CardTitle></CardHeader>
          <CardContent>
            <p><strong>Sentiment:</strong> {analysis.sentiment} ({analysis.score}%)</p>
            <p><strong>Topics:</strong> {analysis.topics.join(', ')}</p>
            <p><strong>Insight:</strong> {analysis.insights}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeedbackAnalyzer;
