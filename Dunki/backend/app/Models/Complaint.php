<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    use HasFactory;

    protected $fillable = [
        'tracking_id',
        'user_id',
        'against_agency',
        'category',
        'subject',
        'description',
        'evidence_path',
        'priority',
        'status',
        'resolution_notes',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    protected $appends = ['evidence_url'];

    public static function boot()
    {
        parent::boot();

        static::creating(function ($complaint) {
            if (empty($complaint->tracking_id)) {
                $complaint->tracking_id = 'CMP-' . date('Y') . '-' . str_pad((string) random_int(1000, 99999), 5, '0', STR_PAD_LEFT);
            }
        });
    }

    public function getEvidenceUrlAttribute(): ?string
    {
        if (!$this->evidence_path) {
            return null;
        }

        return url('storage/' . $this->evidence_path);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
