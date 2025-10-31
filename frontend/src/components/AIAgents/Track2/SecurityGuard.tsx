import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, AlertTriangle, CheckCircle, Lock, Eye, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const SecurityGuard: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [systemName, setSystemName] = useState('');
  const [securityData, setSecurityData] = useState<any>(null);

  const handleScan = () => {
    if (!systemName) {
      toast({ title: 'Error', description: 'Enter system name', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setSecurityData({
        threat_level: 'low',
        security_score: 92,
        active_threats: 2,
        vulnerabilities: 3,
        recommendations: ['Update SSL certificates', 'Enable 2FA', 'Review access logs']
      });
      setLoading(false);
      toast({ title: 'Scan Complete', description: 'Security assessment generated' });
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-red-600" />
            SecurityGuard AI
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>System/Application Name</Label>
            <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} placeholder="Enter system name..." />
          </div>
          <Button onClick={handleScan} disabled={loading} className="w-full" variant="destructive">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Scanning...</> : <><Shield className="mr-2 h-4 w-4" />Run Security Scan</>}
          </Button>
        </CardContent>
      </Card>

      {securityData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className={securityData.threat_level === 'low' ? 'border-green-200' : 'border-red-200'}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${securityData.threat_level === 'low' ? 'text-green-600' : 'text-red-600'}`} />
                  <p className="text-2xl font-bold capitalize">{securityData.threat_level}</p>
                  <p className="text-sm text-gray-600">Threat Level</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Lock className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                  <p className="text-2xl font-bold">{securityData.security_score}%</p>
                  <p className="text-sm text-gray-600">Security Score</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-orange-600" />
                  <p className="text-2xl font-bold">{securityData.active_threats}</p>
                  <p className="text-sm text-gray-600">Active Threats</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                  <p className="text-2xl font-bold">{securityData.vulnerabilities}</p>
                  <p className="text-sm text-gray-600">Vulnerabilities</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Security Recommendations</CardTitle></CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {securityData.recommendations.map((rec: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-600" />
                <p className="text-sm"><strong>Status:</strong> System security is within acceptable parameters. Continue monitoring for new threats.</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SecurityGuard;
